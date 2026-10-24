"""Roof finder: aerial photo at a point -> house outline -> wings -> roof faces.

usage: py roof.py LAT LNG OUTDIR [--footprint FILE.json] [--zoom Z]

Writes OUTDIR/aerial.jpg and prints one JSON object on stdout.
The footprint file, when given, is a list of [lat, lng] pairs (an OSM outline);
it replaces the image cut-out but the photo is still used to place the ridge.
"""
import sys, os, json, math, io, urllib.request
import numpy as np
import cv2

TILE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
UA = {'User-Agent': 'SolarRoofFinder/1.0'}
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache', 'tiles')
VIEW = 640  # output window, px


def world_px(lat, lng, z):
    n = 256 * 2 ** z
    x = (lng + 180) / 360 * n
    s = math.sin(math.radians(lat))
    y = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n
    return x, y


def px_to_ll(px, py, z):
    n = 256 * 2 ** z
    lng = px / n * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * py / n))))
    return lat, lng


def get_tile(z, x, y):
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, f'{z}_{x}_{y}.jpg')
    if not os.path.exists(f):
        req = urllib.request.Request(TILE.format(z=z, x=x, y=y), headers=UA)
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
        with open(f, 'wb') as fh:
            fh.write(data)
    img = cv2.imread(f)
    return img


def blank(tile):
    # Esri serves a flat grey "Map data not yet available" tile where it has nothing
    return tile is None or float(tile.std()) < 6


def aerial(lat, lng, z):
    cx, cy = world_px(lat, lng, z)
    x0, y0 = int(cx - VIEW / 2), int(cy - VIEW / 2)
    tx0, ty0 = x0 // 256, y0 // 256
    tx1, ty1 = (x0 + VIEW - 1) // 256, (y0 + VIEW - 1) // 256
    rows = []
    for ty in range(ty0, ty1 + 1):
        row = []
        for tx in range(tx0, tx1 + 1):
            t = get_tile(z, tx, ty)
            if blank(t):
                return None, None
            row.append(t)
        rows.append(np.hstack(row))
    big = np.vstack(rows)
    ox, oy = x0 - tx0 * 256, y0 - ty0 * 256
    img = big[oy:oy + VIEW, ox:ox + VIEW].copy()
    return img, (x0, y0)


def mpp(lat, z):
    return 156543.03392 * math.cos(math.radians(lat)) / 2 ** z


# ---------- cut the house out of the photo ----------

def segment(img, m, seed=None):
    """GrabCut seeded at the centre (the Eircode point sits on the building) or a clicked pixel."""
    h, w = img.shape[:2]
    c = (int(seed[0]), int(seed[1])) if seed else (w // 2, h // 2)
    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    cv2.circle(mask, c, int(14 / m), cv2.GC_PR_FGD, -1)
    cv2.circle(mask, c, max(3, int(1.5 / m)), cv2.GC_FGD, -1)
    # strong green is lawn, hedge or field: background
    b, g, r = [img[:, :, i].astype(np.int16) for i in range(3)]
    exg = 2 * g - r - b
    veg = (exg > 28) & (g > 60)
    far = np.ones((h, w), np.uint8)
    cv2.circle(far, c, int(32 / m), 0, -1)
    mask[veg & (mask != cv2.GC_FGD)] = cv2.GC_BGD
    mask[far == 1] = cv2.GC_BGD
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgd, fgd, 5, cv2.GC_INIT_WITH_MASK)
    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    k = max(3, int(0.8 / m) | 1)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    n, lab, stats, cents = cv2.connectedComponentsWithStats(fg)
    if n <= 1:
        return None
    # component under the centre, else the nearest big one
    pick = lab[c[1], c[0]]
    if pick == 0:
        best = None
        for i in range(1, n):
            if stats[i, cv2.CC_STAT_AREA] * m * m < 25:
                continue
            d = math.hypot(cents[i][0] - c[0], cents[i][1] - c[1])
            if best is None or d < best[0]:
                best = (d, i)
        if best is None:
            return None
        pick = best[1]
    out = np.where(lab == pick, 255, 0).astype(np.uint8)
    return out


def polygon_of(mask, m):
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not cs:
        return None
    c = max(cs, key=cv2.contourArea)
    return cv2.approxPolyDP(c, 0.6 / m, True).reshape(-1, 2).astype(float)


# ---------- orientation and wings ----------

def dominant_angle(poly):
    """Length-weighted edge direction, folded into [0, 90)."""
    best, score = 0.0, -1
    edges = [(poly[i], poly[(i + 1) % len(poly)]) for i in range(len(poly))]
    for a in np.arange(0, 90, 0.5):
        s = 0.0
        for p, q in edges:
            dx, dy = q - p
            L = math.hypot(dx, dy)
            if L < 1e-6:
                continue
            e = math.degrees(math.atan2(dy, dx)) % 90
            d = min(abs(e - a), 90 - abs(e - a))
            s += L * math.exp(-(d / 4) ** 2)
        if s > score:
            best, score = a, s
    return best


def rot(pts, a, c):
    r = math.radians(a)
    ca, sa = math.cos(r), math.sin(r)
    p = pts - c
    return np.stack([p[:, 0] * ca + p[:, 1] * sa, -p[:, 0] * sa + p[:, 1] * ca], 1)


def unrot(pts, a, c):
    r = math.radians(a)
    ca, sa = math.cos(r), math.sin(r)
    return np.stack([pts[:, 0] * ca - pts[:, 1] * sa, pts[:, 0] * sa + pts[:, 1] * ca], 1) + c


def max_rect(grid):
    """Largest all-ones axis-aligned rectangle (histogram method). Returns x0,y0,x1,y1 exclusive."""
    h, w = grid.shape
    heights = np.zeros(w, int)
    best = (0, None)
    for y in range(h):
        heights = np.where(grid[y], heights + 1, 0)
        stack = []
        for x in range(w + 1):
            hh = heights[x] if x < w else 0
            start = x
            while stack and stack[-1][1] >= hh:
                sx, sh = stack.pop()
                area = sh * (x - sx)
                if area > best[0]:
                    best = (area, (sx, y - sh + 1, x, y + 1))
                start = sx
            stack.append((start, hh))
    return best[1]


def wings(poly, ang, m):
    """Split a rectilinear-ish outline into up to three rectangular wings."""
    c = poly.mean(0)
    rp = rot(poly, ang, c)
    mn = rp.min(0)
    cell = 0.25 / m  # quarter-metre grid
    W = int(math.ceil((rp[:, 0].max() - mn[0]) / cell)) + 1
    H = int(math.ceil((rp[:, 1].max() - mn[1]) / cell)) + 1
    grid = np.zeros((H, W), np.uint8)
    cv2.fillPoly(grid, [np.round((rp - mn) / cell).astype(np.int32)], 1)
    total = grid.sum()
    out = []
    for _ in range(10):
        if len(out) >= 4:
            break
        r = max_rect(grid)
        if r is None:
            break
        x0, y0, x1, y1 = r
        area = (x1 - x0) * (y1 - y0)
        # a sliver left beside a bigger wing is not a roof of its own: drop it and look again
        if min(x1 - x0, y1 - y0) * 0.25 < 3.0 and area >= max(0.10 * total, 14 / (0.25 ** 2)):
            grid[y0:y1, x0:x1] = 0
            continue
        if area < max(0.10 * total, 14 / (0.25 ** 2)):  # ignore porches: under 14 m2 or 10% of the house
            break
        grid[y0:y1, x0:x1] = 0
        corners = np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], float) * cell + mn
        out.append(unrot(corners, ang, c))
    return out


def compass(deg):
    names = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    return names[int((deg % 360) / 22.5 + 0.5) % 16]


def img_bearing(v):
    """Bearing of an image-space vector (x right, y down) clockwise from north."""
    return math.degrees(math.atan2(v[0], -v[1])) % 360


def ridge_split(gray, rect, m):
    """Across the wing, find where brightness steps: that is the ridge. Returns (offset 0..1, contrast)."""
    a, b, cc, d = rect
    along = b - a
    across = d - a
    L, D = np.linalg.norm(along), np.linalg.norm(across)
    if L < 2 or D < 2:
        return 0.5, 0.0
    ua, uc = along / L, across / D
    n = max(8, int(D))
    prof = []
    for i in range(n):
        t = (i + 0.5) / n
        vals = []
        for s in np.linspace(0.15, 0.85, 24):
            p = a + ua * L * s + uc * D * t
            x, y = int(p[0]), int(p[1])
            if 0 <= x < gray.shape[1] and 0 <= y < gray.shape[0]:
                vals.append(gray[y, x])
        prof.append(np.median(vals) if vals else 0)
    prof = np.array(prof, float)
    best, bi = 0.0, n // 2
    lo, hi = int(n * 0.3), int(n * 0.7)
    for i in range(lo, max(lo + 1, hi)):
        diff = abs(prof[:i].mean() - prof[i:].mean())
        if diff > best:
            best, bi = diff, i
    return bi / n, best


def register(img, poly, m, reach=6.0):
    """The map outline and the photo can disagree by a few metres in the country.
    Slide the outline (no rotation) to where its edges sit on the strongest photo edges."""
    gray = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.2)
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    # sample the outline every ~0.3 m, with each edge's normal
    pts, nrm = [], []
    for i in range(len(poly)):
        p, q = poly[i], poly[(i + 1) % len(poly)]
        L = np.linalg.norm(q - p)
        if L < 1e-6:
            continue
        t = (q - p) / L
        n = np.array([-t[1], t[0]])
        for s in np.arange(0, L, 0.3 / m):
            pts.append(p + t * s)
            nrm.append(n)
    pts, nrm = np.array(pts), np.array(nrm)
    R = int(reach / m)
    h, w = gray.shape

    def score(dx, dy):
        x = np.clip(np.round(pts[:, 0] + dx).astype(int), 0, w - 1)
        y = np.clip(np.round(pts[:, 1] + dy).astype(int), 0, h - 1)
        # gradient across the outline (either sign: roof can be darker or lighter than the ground)
        return np.abs(gx[y, x] * nrm[:, 0] + gy[y, x] * nrm[:, 1]).mean()

    base = score(0, 0)
    best = (base, 0, 0)
    for dy in range(-R, R + 1, 2):
        for dx in range(-R, R + 1, 2):
            if dx * dx + dy * dy > R * R:
                continue
            # small preference for staying put
            sc = score(dx, dy) * (1 - 0.02 * math.hypot(dx, dy) * m)
            if sc > best[0]:
                best = (sc, dx, dy)
    _, bx, by = best
    for dy in range(by - 2, by + 3):
        for dx in range(bx - 2, bx + 3):
            sc = score(dx, dy) * (1 - 0.02 * math.hypot(dx, dy) * m)
            if sc > best[0]:
                best = (sc, dx, dy)
    sc, dx, dy = best
    # only move when the photo clearly agrees better
    if sc < base * 1.15:
        return poly, (0.0, 0.0), base, base
    return poly + np.array([dx, dy], float), (dx * m, dy * m), base, sc


def analyse(lat, lng, outdir, footprint=None, zoom=None, align=True, seed=None):
    z = zoom or 20
    img, origin = aerial(lat, lng, z)
    if img is None:
        z = 19
        img, origin = aerial(lat, lng, z)
    if img is None:
        return {'ok': False, 'error': 'No aerial imagery here'}
    m = mpp(lat, z)
    os.makedirs(outdir, exist_ok=True)
    cv2.imwrite(os.path.join(outdir, 'aerial.jpg'), img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    res = {'ok': True, 'zoom': z, 'mpp': m, 'size': VIEW, 'origin': origin, 'lat': lat, 'lng': lng}

    source = 'photo'
    poly = None
    if footprint:
        pts = [world_px(p[0], p[1], z) for p in footprint]
        poly = np.array([[x - origin[0], y - origin[1]] for x, y in pts], float)
        source = 'map outline'
        if align:
            poly, shift, s0, s1 = register(img, poly, m)
            res['shift_m'] = [round(shift[0], 2), round(shift[1], 2)]
            res['edge_score'] = [round(float(s0), 1), round(float(s1), 1)]
    else:
        sp = None
        if seed:
            sx, sy = world_px(seed[0], seed[1], z)
            sp = (sx - origin[0], sy - origin[1])
        mask = segment(img, m, sp)
        if mask is not None:
            poly = polygon_of(mask, m)
    if poly is None or len(poly) < 3:
        res.update(ok=False, error='Could not pick out the house in the photo')
        return res
    area = cv2.contourArea(poly.astype(np.float32)) * m * m
    res['source'] = source
    res['outline'] = poly.round(1).tolist()
    res['area_m2'] = round(area, 1)
    if area < 40:
        res['warn'] = f'Outline is only {area:.0f} m2: a shed or garage? Use Wrong building? to pick the house.'
    elif area > 900:
        res['warn'] = f'Outline is {area:.0f} m2, big for a house. Check it is the right building.'

    ang = dominant_angle(poly)
    res['grid_deg'] = ang
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(float)
    ws = []
    for rect in wings(poly, ang, m):
        a, b, c, d = rect
        e1, e2 = np.linalg.norm(b - a), np.linalg.norm(d - a)
        if e1 < e2:  # make a->b the long side: the ridge runs along it
            rect = np.array([a, d, c, b])
            a, b, c, d = rect
            e1, e2 = e2, e1
        off, contrast = ridge_split(gray, rect, m)
        guessed = 'long side'
        if e1 / max(e2, 1e-6) < 1.3:
            # near square: the ridge runs whichever way the photo shows a lit/shaded split
            alt = np.array([b, c, d, a])
            off2, contrast2 = ridge_split(gray, alt, m)
            if contrast2 > 1.5 * contrast and contrast2 > 10:
                rect, off, contrast = alt, off2, contrast2
                a, b, c, d = rect
                e1, e2 = e2, e1
                guessed = 'photo shading'
        across = d - a
        r0 = a + across * off
        r1 = b + across * off
        # outward normals of the two faces, in image space
        nA = -across / np.linalg.norm(across)
        nB = across / np.linalg.norm(across)
        faces = []
        for name, n, depth, poly4 in (
            ('A', nA, off * e2, [a, b, r1, r0]),
            ('B', nB, (1 - off) * e2, [r0, r1, c, d]),
        ):
            az = img_bearing(n)
            faces.append({
                'id': name,
                'azimuth': round(az, 1),
                'compass': compass(az),
                'length_m': round(e1 * m, 2),
                'depth_m': round(depth * m, 2),
                'corners': np.array(poly4).round(1).tolist(),
            })
        ws.append({
            'rect': rect.round(1).tolist(),
            'length_m': round(e1 * m, 2),
            'width_m': round(e2 * m, 2),
            'ridge': [r0.round(1).tolist(), r1.round(1).tolist()],
            'ridge_bearing': round(img_bearing(b - a) % 180, 1),
            'ridge_contrast': round(float(contrast), 1),
            'ridge_from': guessed,
            'faces': faces,
        })
    if not ws:
        res.update(ok=False, error='Outline found but no rectangular wing in it')
        return res
    res['wings'] = ws
    return res


def main():
    a = sys.argv[1:]
    lat, lng, outdir = float(a[0]), float(a[1]), a[2]
    fp, z = None, None
    if '--footprint' in a:
        fp = json.load(open(a[a.index('--footprint') + 1]))
    if '--zoom' in a:
        z = int(a[a.index('--zoom') + 1])
    seed = None
    if '--seed' in a:
        seed = [float(v) for v in a[a.index('--seed') + 1].split(',')]
    try:
        res = analyse(lat, lng, outdir, fp, z, align='--no-align' not in a, seed=seed)
    except Exception as e:
        res = {'ok': False, 'error': f'{type(e).__name__}: {e}'}
    print(json.dumps(res))


if __name__ == '__main__':
    main()
