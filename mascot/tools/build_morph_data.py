"""Builds mascot/animations/dogMorphData.json from mascot/assets/dog-pose-1.svg and dog-pose-2.svg.
Run:  python3 mascot/tools/build_morph_data.py   (needs numpy)
Output: the JSON with, for every element, matched cubic-bezier point arrays
(pose1 absolute, pose2 in the part's local frame) and per-part rigid params."""
import re, json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
POSE1 = os.path.join(HERE, '..', 'assets', 'dog-pose-1.svg')
POSE2 = os.path.join(HERE, '..', 'assets', 'dog-pose-2.svg')
OUT = os.path.join(HERE, '..', 'animations', 'dogMorphData.json')
import numpy as np

def paths(fn):
    s = open(fn).read()
    return re.findall(r'<path ([^>]*?)/>', s)

def attr(p, name):
    m = re.search(r'\b' + name + r'="([^"]*)"', p)
    return m.group(1) if m else None

def parse(d):
    toks = re.findall(r'[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?', d)
    i, segs, cur, start, closed = 0, [], None, None, False
    cmd = None
    while i < len(toks):
        t = toks[i]
        if t in 'MLCZ':
            cmd = t; i += 1
            if t == 'Z':
                if np.hypot(*(np.array(cur) - start)) > 1e-6:
                    segs.append(line(cur, start))
                closed = True; cur = tuple(start)
            continue
        if cmd == 'M':
            cur = (float(toks[i]), float(toks[i+1])); start = np.array(cur); i += 2; cmd = 'L'
        elif cmd == 'L':
            p = (float(toks[i]), float(toks[i+1])); i += 2
            segs.append(line(cur, p)); cur = p
        elif cmd == 'C':
            v = [float(x) for x in toks[i:i+6]]; i += 6
            segs.append(np.array([cur, v[0:2], v[2:4], v[4:6]], float)); cur = tuple(v[4:6])
    return segs, closed

def line(a, b):
    a, b = np.array(a, float), np.array(b, float)
    return np.array([a, a + (b - a) / 3, a + 2 * (b - a) / 3, b])

def seglen(s):
    ts = np.linspace(0, 1, 17)
    pts = np.array([bez(s, t) for t in ts])
    return np.sum(np.hypot(*np.diff(pts, axis=0).T))

def bez(s, t):
    u = 1 - t
    return u**3*s[0] + 3*u*u*t*s[1] + 3*u*t*t*s[2] + t**3*s[3]

def split(s, t=0.5):
    p01 = s[0]+(s[1]-s[0])*t; p12 = s[1]+(s[2]-s[1])*t; p23 = s[2]+(s[3]-s[2])*t
    a = p01+(p12-p01)*t; b = p12+(p23-p12)*t; m = a+(b-a)*t
    return np.array([s[0], p01, a, m]), np.array([m, b, p23, s[3]])

def subdivide(segs, n):
    segs = list(segs)
    while len(segs) < n:
        L = [seglen(s) for s in segs]
        k = int(np.argmax(L))
        a, b = split(segs[k]); segs[k:k+1] = [a, b]
    return segs

def sample(segs, m=160):
    L = np.array([seglen(s) for s in segs]); cum = np.concatenate([[0], np.cumsum(L)])
    out = []
    for d in np.linspace(0, cum[-1], m, endpoint=False):
        k = min(np.searchsorted(cum, d, side='right') - 1, len(segs) - 1)
        out.append(bez(segs[k], (d - cum[k]) / L[k] if L[k] else 0))
    return np.array(out)

def procrustes(X, Y):
    xm, ym = X.mean(0), Y.mean(0); Xc, Yc = X - xm, Y - ym
    th = math.atan2(np.sum(Xc[:, 0]*Yc[:, 1] - Xc[:, 1]*Yc[:, 0]), np.sum(Xc*Yc))
    R = np.array([[math.cos(th), -math.sin(th)], [math.sin(th), math.cos(th)]])
    t = ym - R @ xm
    err = np.mean(np.sum((X @ R.T + t - Y)**2, 1))
    return th, R, t, err

def best_fit(segA, segB, closed, maxang=math.pi):
    X = sample(segA); Y0 = sample(segB); best = None
    cands = []
    for rev in (False, True):
        Y = Y0[::-1] if rev else Y0
        shifts = range(len(Y)) if closed else [0]
        for k in shifts:
            cands.append(np.roll(Y, -k, axis=0))
    for Y in cands:
        r = procrustes(X, Y)
        if abs(r[0]) > maxang: continue
        if best is None or r[3] < best[3]: best = r
    return best

def rev_segs(segs):
    return [s[::-1].copy() for s in segs[::-1]]

def match(segA, segB_local, closed):
    n = max(len(segA), len(segB_local), 6)
    n = int(math.ceil(n * 1.5))
    A = subdivide(segA, n); B = subdivide(segB_local, n)
    flatA = np.array([s[0] for s in A])
    best = None
    for rev in (False, True):
        BB = rev_segs(B) if rev else B
        for k in (range(n) if closed else [0]):
            C = BB[k:] + BB[:k]
            cost = np.sum((np.array([s[0] for s in C]) - flatA)**2)
            cost += np.sum((np.array([s[1] for s in C]) - np.array([s[1] for s in A]))**2) * 0.3
            if not closed:
                cost += np.sum((C[-1][3] - A[-1][3])**2)
            if best is None or cost < best[0]: best = (cost, C)
    return A, best[1]

def flat(segs):
    pts = [segs[0][0]] + [p for s in segs for p in s[1:]]
    return [round(float(v), 3) for p in pts for v in p]

P1 = paths(POSE1); P2 = paths(POSE2)

# Pose-1 geometry fix: the outer contour of the left front leg ended in a round cap just beside the
# body outline, so it read as a chopped stub. Its top is extended upward exactly along the body
# outline (same curve, same colour, same width), so the leg contour grows out of the body line.
_FL_HL = 'M84.3921 203.083C81.1278 195.782 76.7542 177.252 77.077 162.145'
assert _FL_HL in P1[11]
P1[11] = P1[11].replace(_FL_HL, _FL_HL + 'C76.591 157.106 76.683 151.925 77.211 146.727')

def grads(fn):
    s = open(fn).read(); out = {}
    for m in re.finditer(r'<linearGradient id="([^"]+)" x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"[^>]*>(.*?)</linearGradient>', s, re.S):
        stops = []
        for st in re.finditer(r'<stop([^>]*)/>', m.group(6)):
            a = st.group(1)
            col = re.search(r'stop-color="([^"]+)"', a).group(1)
            op = re.search(r'stop-opacity="([^"]+)"', a); off = re.search(r'offset="([^"]+)"', a)
            stops.append({'c': hexrgb(col), 'o': float(op.group(1)) if op else 1, 'off': float(off.group(1)) if off else 0})
        out[m.group(1)] = {'p': [float(m.group(i)) for i in range(2, 6)], 'stops': stops}
    return out

def hexrgb(c):
    c = {'white': '#FFFFFF', 'black': '#000000'}.get(c, c)
    return [int(c[i:i+2], 16) for i in (1, 3, 5)]

G1 = grads(POSE1); G2 = grads(POSE2)

# part: (name, parent, anchor in pose1, fit element index (p1,p2), [elements])
# element: (p1 index or None, p2 index)
# legs never flip over: limit how far a leg may rotate between poses
MAXANG = {n: math.radians(80) for n in ('backL', 'backR', 'frontL', 'frontR')}

PARTS = [
  ('backL', 'body', (80, 166), [(0, 0), (None, 1), (1, 2), (2, 3), (3, 4)]),
  ('tail', 'body', (157, 186), [(4, 5)]),
  ('body', None, None, [(5, 6), (6, 8), (8, 9)]),
  ('frontL', 'body', (90, 163), [(9, 18), (10, 19), (11, 20)]),
  ('frontR', 'body', (126, 163), [(22, 10), (23, 11), (24, 12)]),
  ('backR', 'body', (160, 166), [(25, 13), (26, 14), (27, 15), (28, 16), (29, 17)]),
  ('head', 'body', (106, 138), [(12, 21), (13, 22), (14, 23), (15, 24), (16, 25)]),
  ('earR', 'head', (136, 47), [(17, 26), (18, 27), (19, 28)]),
  ('earL', 'head', (72, 54), [(20, 29), (21, 30)]),
  # The shadow under the head is cast by the head, so it rides in the head's frame (not the body's)
  # and morphs between its pose-1 and pose-2 shapes there; the player clips it to the body silhouette.
  ('shadow', 'body', (106, 138), [(7, 7)]),
]
FORCE_FIT = {'shadow': 'head'}
FITS = {}

def style(p, G, eid):
    s = {}
    f = attr(p, 'fill'); st = attr(p, 'stroke')
    if f and f != 'none': s['fill'] = hexrgb(f); s['fo'] = float(attr(p, 'fill-opacity') or 1)
    if st:
        if st.startswith('url'):
            g = G[st[5:-1]]; s['grad'] = g
        else:
            c = hexrgb(st); s['grad'] = None; s['stroke'] = c
    return s

def as_grad(sty, ref_pts):
    if not sty or 'stroke' not in sty and sty.get('grad') is None: return None
    if sty.get('grad'): return sty['grad']
    c = sty['stroke']
    return {'p': ref_pts, 'stops': [{'c': c, 'o': 1, 'off': 0}, {'c': c, 'o': 1, 'off': 1}]}

# Shoulder skinning: points near the top of a leg follow the body, points near the paw follow the leg.
# (y where weight is fully body, y where it is fully leg) in pose-1 coordinates.
SKIN = {'frontL': (168, 196), 'frontR': (168, 196)}
_b = [p for p in PARTS if p[0] == 'body'][0]
_sa, _ca = parse(attr(P1[_b[3][0][0]], 'd')); _sb, _ = parse(attr(P2[_b[3][0][1]], 'd'))
_, RB, TB, _ = best_fit(_sa, _sb, _ca)
body_inv = lambda Y: (Y - TB) @ RB

def skin_w(pts, rng):
    y0, y1 = rng
    u = np.clip((np.array(pts)[:, 1] - y0) / (y1 - y0), 0, 1)
    return [round(float(1 - v*v*(3 - 2*v)), 3) for v in u]

out = {'parts': []}
for name, parent, anchor, els in PARTS:
    i1, i2 = els[0]
    sA, cA = parse(attr(P1[i1], 'd')); sB, cB = parse(attr(P2[i2], 'd'))
    if name in FORCE_FIT:
        th, R, t, err = FITS[FORCE_FIT[name]]
    else:
        th, R, t, err = best_fit(sA, sB, cA, MAXANG.get(name, math.pi))
    FITS[name] = (th, R, t, err)
    if anchor is None:
        anchor = sample(sA).mean(0)
    A1 = np.array(anchor, float); A2 = R @ A1 + t
    inv = lambda Y: (Y - t) @ R  # R^T (y - t) row-wise
    part = {'name': name, 'parent': parent, 'A1': [round(float(v), 3) for v in A1],
            'A2': [round(float(v), 3) for v in A2], 'th': round(th, 5), 'err': round(float(err), 2), 'els': []}
    for (j1, j2) in els:
        sb, cb = parse(attr(P2[j2], 'd'))
        sb_local = [inv(s) for s in sb]
        st2 = style(P2[j2], G2, j2)
        if j1 is None:
            # grows in from its own midpoint
            Bm = subdivide(sb_local, max(len(sb_local), 4))
            c = sample(Bm).mean(0)
            A = [np.array([c, c, c, c]) for _ in Bm]
            st1 = None
            closed = cb
        else:
            sa, ca = parse(attr(P1[j1], 'd'))
            closed = ca and cb
            A, Bm = match(sa, sb_local, closed)
            st1 = style(P1[j1], G1, j1)
        el = {'a': flat(A), 'b': flat(Bm), 'z': bool(closed), 'grow': j1 is None}
        sref = st1 or st2
        el['sw'] = 6 if attr(P2[j2], 'stroke') else 0
        if 'fill' in st2:
            el['fill'] = st2['fill']; el['fo'] = [ (st1 or st2).get('fo', 1), st2['fo'] ]
        solid1 = st1 is None or st1.get('grad') is None
        if attr(P2[j2], 'stroke') and st2.get('grad') is None and solid1:
            el['sc'] = [(st1 or st2)['stroke'], st2['stroke']]
        elif attr(P2[j2], 'stroke'):
            g2 = as_grad(st2, None)
            g1 = as_grad(st1, None) if st1 else g2
            if g1['p'] is None: g1 = dict(g1, p=g2['p'])
            if g2['p'] is None: g2 = dict(g2, p=g1['p'])
            # gradient endpoints: pose1 absolute, pose2 into local frame (they ride with the part)
            p2l = inv(np.array(g2['p']).reshape(2, 2)).ravel()
            el['g'] = {'a': [round(float(v), 3) for v in g1['p']], 'b': [round(float(v), 3) for v in p2l],
                       'sa': g1['stops'], 'sb': g2['stops']}
        if name == 'shadow':
            el['over'] = 1   # drawn over the front-leg shoulders so they shade like the chest
            # Mid-move the shadow is the head outline pushed DROP px toward the body (a crescent along the
            # side of the head that faces the body). Near the poses it blends into the original shapes.
            DROP = 9.0
            hs_raw, _ = parse(attr(P1[12], 'd'))               # head fill, pose 1 = head-local frame
            Hs = subdivide(hs_raw, len(A)); best = None
            for rev in (False, True):
                HH = rev_segs(Hs) if rev else Hs
                for k in range(len(HH)):
                    C = HH[k:] + HH[:k]
                    cost = sum(np.sum((C[q][0] - A[q][0])**2) for q in range(len(A)))
                    if best is None or cost < best[0]: best = (cost, C)
            Hs = best[1]
            hc1 = sample(hs_raw).mean(0)
            bodyp = out['parts'][[p['name'] for p in out['parts']].index('body')]
            bc1, bc2 = np.array(bodyp['A1']), np.array(bodyp['A2'])
            def vloc(hc, bc, ang):
                d = (bc - hc) / np.linalg.norm(bc - hc)
                c_, s_ = math.cos(-ang), math.sin(-ang)
                return DROP * np.array([c_ * d[0] - s_ * d[1], s_ * d[0] + c_ * d[1]])
            v0 = vloc(hc1, bc1, 0.0); v1 = vloc(R @ hc1 + t, bc2, th)
            hsf = np.array(flat(Hs)).reshape(-1, 2)
            el['hs'] = [round(float(x), 3) for x in hsf.ravel()]
            el['d1'] = [round(float(x), 3) for x in (np.array(el['a']).reshape(-1, 2) - hsf - v0).ravel()]
            el['d2'] = [round(float(x), 3) for x in (np.array(el['b']).reshape(-1, 2) - hsf - v1).ravel()]
            el['hc'] = [round(float(x), 3) for x in hc1]; el['bc'] = [round(float(x), 3) for x in bc1]; el['drop'] = DROP
        if name == 'frontL' and j1 == 11:
            # the pose-1 extension along the body outline retracts into the shoulder point early in a pose change
            pa = np.array(el['a']).reshape(-1, 2); base = np.array([77.077, 162.145])
            ext = (pa[:, 1] < base[1] - 0.01) & (pa[:, 0] < 80)
            a2 = pa.copy(); a2[ext] = base
            el['a2'] = [round(float(v), 3) for v in a2.ravel()]
        if name in SKIN:
            pa = np.array(el['a']).reshape(-1, 2); pb = np.array(el['b']).reshape(-1, 2)
            el['bb'] = [round(float(v), 3) for v in (pb @ R.T + t).ravel()]  # shoulder target: pose-2 absolute (straight path)
            el['w'] = skin_w(pa, SKIN[name])
            if 'g' in el:
                # gradient endpoints ride on the stroke itself: nearest stroke point in each pose + offset
                g = el['g']; P2abs = pb @ R.T + t
                e1 = np.array(g['a']).reshape(2, 2); e2 = np.array(g['b']).reshape(2, 2) @ R.T + t
                g['att'] = []
                for k in range(2):
                    i1 = int(np.argmin(np.sum((pa - e1[k])**2, 1))); i2 = int(np.argmin(np.sum((P2abs - e2[k])**2, 1)))
                    g['att'].append([i1, i2, *[round(float(v), 3) for v in e1[k] - pa[i1]], *[round(float(v), 3) for v in e2[k] - P2abs[i2]]])
                # which stop sits at the shoulder (higher skin weight) — it stays dissolved in the body mid-move
                w = el['w']
                g['sh'] = 0 if w[g['att'][0][0]] + w[g['att'][0][1]] > w[g['att'][1][0]] + w[g['att'][1][1]] else 1
        part['els'].append(el)
    out['parts'].append(part)
    print(f"{name:7s} th={math.degrees(th):7.1f}  err={err:7.1f}  A1={A1.round(1)} A2={A2.round(1)}")

json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print('bytes', len(json.dumps(out, separators=(',', ':'))))
