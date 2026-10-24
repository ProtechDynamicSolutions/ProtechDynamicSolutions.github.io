"""House outline from an Eircode Finder map screenshot.

The finder's street map draws every building as a flat grey (about 192-225)
bounded by darker lines, on a pale ground (240+) and white roads. The address
sits under the red crosshair. We take the grey patch under the crosshair.

usage: py footprint.py MAP.png LAT LNG ZOOM [DEBUG.png]
prints {"ok":true,"outline":[[lat,lng],...],"area_m2":..} or {"ok":false,...}
"""
import sys, json, math
import numpy as np
import cv2


def crosshair(img):
    b, g, r = [img[:, :, i].astype(int) for i in range(3)]
    red = ((r > 180) & (r - g > 80) & (r - b > 40)).astype(np.uint8)
    n, lab, st, ce = cv2.connectedComponentsWithStats(red)
    h, w = red.shape
    best = None
    for i in range(1, n):
        x, y, bw, bh, a = st[i]
        # the crosshair is a ring ~40 px across near the middle; address dots are ~10 px
        if a > 150 and 25 < bw < 70 and 25 < bh < 70:
            d = math.hypot(ce[i][0] - w / 2, ce[i][1] - h / 2)
            if d < 80 and (best is None or d < best[0]):
                best = (d, ce[i], (x, y, bw, bh))
    if best is None:
        return (w / 2, h / 2), None
    return tuple(best[1]), best[2]


def extract(img, lat, lng, zoom, debug=None, anchor=None, near=12.0):
    h, w = img.shape[:2]
    if anchor:  # the finder told us where its crosshair was before we hid it
        (cx, cy), box = anchor, None
    else:
        (cx, cy), box = crosshair(img)
    m = 156543.03392 * math.cos(math.radians(lat)) / 2 ** zoom
    # paint out the red crosshair, address dots and their white rings
    b, g, r = [img[:, :, i].astype(int) for i in range(3)]
    red = ((r > 150) & (r - g > 60)).astype(np.uint8) * 255
    # every address point is a small red dot: semis and terraces share one grey block
    dn, _, dst, dce = cv2.connectedComponentsWithStats(red)
    dots = [tuple(dce[i]) for i in range(1, dn) if 12 <= dst[i, 4] <= 200 and dst[i, 2] < 24 and dst[i, 3] < 24]
    red = cv2.dilate(red, np.ones((5, 5), np.uint8))
    if box:
        x, y, bw, bh = box
        cv2.circle(red, (int(cx), int(cy)), int(max(bw, bh) / 2) + 3, 255, -1)
    clean = cv2.inpaint(img, red, 4, cv2.INPAINT_TELEA)
    gray = cv2.cvtColor(clean, cv2.COLOR_BGR2GRAY).astype(int)
    cb, cg, cr = [clean[:, :, i].astype(int) for i in range(3)]
    neutral = (np.abs(cr - cg) < 10) & (np.abs(cg - cb) < 10)
    bldg = (neutral & (gray >= 186) & (gray <= 231)).astype(np.uint8)
    # labels (house numbers) are holes inside the grey; the outer contour ignores them.
    # No closing here: it would bridge the 1 px party wall between semis.
    # boundary and fence lines are the same grey but only 1-3 px wide: strip them
    k = max(5, int(round(1.0 / m)) | 1)
    bldg = cv2.morphologyEx(bldg, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (k, k)))
    n, lab, st, ce = cv2.connectedComponentsWithStats(bldg, connectivity=4)
    pick = lab[int(cy), int(cx)]
    if pick == 0:
        # point on a yard or the outline itself: nearest building within reach
        best = None
        for i in range(1, n):
            if st[i, 4] * m * m < 15:
                continue
            ys, xs = np.nonzero(lab == i)
            d = np.min(np.hypot(xs - cx, ys - cy)) * m
            if d < near and (best is None or d < best[0]):
                best = (d, i)
        if best is None:
            return {'ok': False, 'error': 'No building under the Eircode point on the finder map'}
        pick = best[1]
    mask = (lab == pick).astype(np.uint8) * 255
    # the outline line itself is ~1-2 px: grow back by one pixel
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8))
    # several addresses in one block (semi-d, terrace): keep the share nearest our dot
    inside = [d for d in dots if mask[min(h - 1, int(d[1])), min(w - 1, int(d[0]))]]
    split = 0
    if len(inside) >= 2:
        ours = min(inside, key=lambda d: math.hypot(d[0] - cx, d[1] - cy))
        ys, xs = np.nonzero(mask)
        dist = np.stack([np.hypot(xs - d[0], ys - d[1]) for d in inside])
        mine = dist.argmin(0) == inside.index(ours)
        part = np.zeros_like(mask)
        part[ys[mine], xs[mine]] = 255
        mask = cv2.morphologyEx(part, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        split = len(inside)
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    area = cv2.contourArea(c) * m * m
    touches = (c[:, 0, 0].min() <= 1 or c[:, 0, 1].min() <= 1 or
               c[:, 0, 0].max() >= w - 2 or c[:, 0, 1].max() >= h - 2)
    poly = cv2.approxPolyDP(c, max(1.0, 0.25 / m), True).reshape(-1, 2).astype(float)
    # pixel -> lat/lng (Web Mercator about the crosshair)
    n2 = 256 * 2 ** zoom
    X0 = (lng + 180) / 360 * n2
    s = math.sin(math.radians(lat))
    Y0 = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n2
    out = []
    for px, py in poly:
        X, Y = X0 + (px - cx), Y0 + (py - cy)
        la = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * Y / n2))))
        lo = X / n2 * 360 - 180
        out.append([round(la, 7), round(lo, 7)])
    if debug:
        d = img.copy()
        cv2.drawContours(d, [c], -1, (0, 160, 0), 2)
        cv2.circle(d, (int(cx), int(cy)), 4, (255, 0, 0), -1)
        cv2.imwrite(debug, d)
    res = {'ok': True, 'outline': out, 'area_m2': round(area, 1), 'mpp': m,
           'anchor_px': [round(cx, 1), round(cy, 1)], 'vertices': len(out), 'shared_with': max(0, split - 1)}
    if touches:
        res['warn'] = 'Building runs off the edge of the finder map; outline is cut short'
    if area > 1500:
        res['warn'] = f'Building under the point is {area:.0f} m2: not a house, or a whole terrace'
    return res


if __name__ == '__main__':
    a = sys.argv[1:]
    img = cv2.imread(a[0])
    anchor = json.loads(a[5]) if len(a) > 5 else None
    near = float(a[6]) if len(a) > 6 else 12.0
    print(json.dumps(extract(img, float(a[1]), float(a[2]), int(a[3]), a[4] if len(a) > 4 and a[4] != '-' else None, anchor, near)))
