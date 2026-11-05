#!/usr/bin/env python3
"""
Measures where an accessory sits on the dog from reference images.

    python3 accessories/tools/fit_placement.py ACCESSORY.svg POSE.svg REFERENCE.png [COLOURS]

ACCESSORY.svg  the accessory (e.g. accessories/head/christmas-hat/assets/christmas-hat.svg)
POSE.svg       the dog pose shown on the reference (mascot/assets/dog-pose-1.svg or -2.svg)
REFERENCE.png  screenshot of the dog wearing the accessory (any zoom, any position)
COLOURS        which colour masks to fit by: hat (red cloth + blue-grey outline, default)
               or carrot (orange root + green leaves) or bow (light pink + dark pink outline)
               or ball (light yellow-green + dark olive outline)

Prints { x, y, rotate } — the accessory's SVG origin in the dog's 240×240 frame and its rotation —
ready for the `placement.pose1` / `placement.pose2` of an accessory.

How: the dog's eyes and nose (the three black shapes) register the screenshot to the dog's
coordinates; then the accessory is fitted to the screenshot by two colour masks (see COLOURS)
with a scale + rotation + shift search.
Needs: rsvg-convert, Python 3 with numpy, scipy, opencv-python.
"""
import subprocess, sys, tempfile, os
import cv2
import numpy as np
from scipy.optimize import minimize

Z = 4.0  # render zoom for the SVGs


def render(svg, bg=None):
    out = os.path.join(tempfile.mkdtemp(), 'r.png')
    cmd = ['rsvg-convert', '-z', str(Z), svg, '-o', out]
    if bg: cmd[1:1] = ['-b', bg]
    subprocess.run(cmd, check=True)
    return cv2.imread(out, cv2.IMREAD_UNCHANGED)


def dark_features(img):
    """Centroids of the three largest near-black shapes: nose, big eye, small eye (by area)."""
    g = cv2.cvtColor(img[..., :3], cv2.COLOR_BGR2GRAY)
    n, _, st, c = cv2.connectedComponentsWithStats((g < 18).astype(np.uint8))
    blobs = sorted(((st[i, 4], c[i]) for i in range(1, n) if st[i, 4] > 50), key=lambda b: -b[0])[:3]
    return np.array([b[1] for b in blobs])


def similarity(src, dst):
    """Least-squares similarity src → dst (Umeyama, no reflection). Returns 2×3."""
    ms, md = src.mean(0), dst.mean(0)
    S, D = src - ms, dst - md
    U, sig, Vt = np.linalg.svd(D.T @ S)
    R = U @ Vt
    s = sig.sum() / (S ** 2).sum()
    return np.hstack([s * R, (md - s * R @ ms)[:, None]])


def masks(img, alpha=None, colours='hat'):
    b, g, r = [img[..., i].astype(int) for i in range(3)]
    if colours == 'ball':
        one = (g > 165) & (g - b > 80) & (r > 110)                            # light yellow-green
        two = (g > 80) & (g < 140) & (g - b > 35) & (r < 130)                 # dark olive outline
    elif colours == 'bow':
        one = (r > 200) & (g > 70) & (b > 120) & (r - g > 40)                 # light pink
        two = (r > 140) & (r < 215) & (g < 70) & (b < 120)                    # dark pink outline
    elif colours == 'carrot':
        one = (r > 190) & (g > 70) & (g < 215) & (b < 90) & (r - g > 40)      # orange root
        two = (g > 90) & (g - r > 15) & (g - b > 60)                          # green leaves
    else:
        one = (r > 110) & (g < 100) & (b < 100)                               # red cloth
        two = (b - r > 12) & (b > 120) & (b < 210)                            # blue-grey outline
    if alpha is not None:
        one &= alpha > 128; two &= alpha > 128
    return one.astype(np.float32), two.astype(np.float32)


def main(acc_svg, pose_svg, ref_png, colours='hat'):
    ref = cv2.imread(ref_png)
    dog = render(pose_svg, '#1f1f1f')
    to_dog = similarity(dark_features(ref), dark_features(dog) / Z)   # screenshot px → dog units

    acc = render(acc_svg)
    ar, ab = masks(acc[..., :3], acc[..., 3], colours)
    tr, tb = masks(ref, None, colours)
    H, W = tr.shape
    TR, TB = (cv2.GaussianBlur(m, (0, 0), 3) for m in (tr, tb))
    ys, xs = np.nonzero(np.maximum(tr, tb))
    hy, hx = np.nonzero(np.maximum(ar, ab))

    def A(p):  # accessory render px → screenshot px
        s, th, tx, ty = p
        c, n = np.cos(th) * s / Z, np.sin(th) * s / Z
        return np.array([[c, -n, tx], [n, c, ty]])

    def loss(p, sig=3):
        wr, wb = (cv2.warpAffine(m, A(p), (W, H)) for m in (ar, ab))
        return -((cv2.GaussianBlur(wr, (0, 0), sig) * TR).sum() / (np.sqrt(wr.sum() * tr.sum()) + 1)
                 + (cv2.GaussianBlur(wb, (0, 0), sig) * TB).sum() / (np.sqrt(wb.sum() * tb.sum()) + 1))

    s0 = (xs.max() - xs.min()) / ((hx.max() - hx.min()) / Z)
    best = None
    for th in np.radians(np.arange(-60, 61, 10)):
        for sf in (0.9, 1.0, 1.1):
            p = [s0 * sf, th, 0, 0]
            cx, cy = A(p)[:, :2] @ [hx.mean(), hy.mean()]
            p[2], p[3] = xs.mean() - cx, ys.mean() - cy
            r = minimize(loss, p, method='Nelder-Mead', options={'maxiter': 600})
            if best is None or r.fun < best.fun: best = r
    p = minimize(lambda q: loss(q, 1.5), best.x, method='Nelder-Mead', options={'maxiter': 800}).x

    s, th, tx, ty = p
    c, n = np.cos(th) * s, np.sin(th) * s
    acc_to_shot = np.array([[c, -n, tx], [n, c, ty], [0, 0, 1]])
    M = np.vstack([to_dog, [0, 0, 1]]) @ acc_to_shot
    scale = np.hypot(M[0, 0], M[1, 0])
    rot = np.degrees(np.arctan2(M[1, 0], M[0, 0]))
    print(f'{{ x: {M[0, 2]:.2f}, y: {M[1, 2]:.2f}, rotate: {rot:.2f} }}   // scale {scale:.4f}')


if __name__ == '__main__':
    if len(sys.argv) not in (4, 5):
        sys.exit(__doc__)
    main(*sys.argv[1:])
