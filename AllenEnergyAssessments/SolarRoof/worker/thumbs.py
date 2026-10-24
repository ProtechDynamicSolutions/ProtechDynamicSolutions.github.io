"""Small JPEGs of the finder map cut-out and the finder result page.

usage: py thumbs.py RUNDIR [ANCHOR_JSON]
writes RUNDIR/cut-thumb.jpg and RUNDIR/result-thumb.jpg, prints {"ok": true}
"""
import sys, os, json
import cv2

d = sys.argv[1]
anchor = json.loads(sys.argv[2]) if len(sys.argv) > 2 else None
q = [cv2.IMWRITE_JPEG_QUALITY, 82]

cut = cv2.imread(os.path.join(d, 'finder-cut.png'))
if cut is not None:
    h, w = cut.shape[:2]
    cx, cy = (anchor or [w / 2, h / 2])
    x0 = int(min(max(0, cx - 240), max(0, w - 480)))
    y0 = int(min(max(0, cy - 180), max(0, h - 360)))
    cv2.imwrite(os.path.join(d, 'cut-thumb.jpg'), cut[y0:y0 + 360, x0:x0 + 480], q)

res = cv2.imread(os.path.join(d, 'finder-result.png'))
if res is not None:
    top = res[:min(res.shape[0], 760)]
    s = 480 / top.shape[1]
    cv2.imwrite(os.path.join(d, 'result-thumb.jpg'), cv2.resize(top, (480, int(top.shape[0] * s)), interpolation=cv2.INTER_AREA), q)

print(json.dumps({'ok': True}))
