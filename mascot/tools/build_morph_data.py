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

# ---------- SVG reading: paths, ellipses (as paths), masks, gradients ----------
import xml.etree.ElementTree as ET
SVGNS = '{http://www.w3.org/2000/svg}'

def ellipse_d(cx, cy, rx, ry, rot_deg):
    """Ellipse as 4 cubic arcs, rotation baked into the points."""
    k = 0.5522847498; a = math.radians(rot_deg); ca, sa = math.cos(a), math.sin(a)
    P = lambda x, y: (cx + ca * x - sa * y, cy + sa * x + ca * y)
    q = [(rx, 0), (rx, k * ry), (k * rx, ry), (0, ry), (-k * rx, ry), (-rx, k * ry), (-rx, 0),
         (-rx, -k * ry), (-k * rx, -ry), (0, -ry), (k * rx, -ry), (rx, -k * ry), (rx, 0)]
    pts = [P(*v) for v in q]
    d = 'M%.4f %.4f' % pts[0]
    for i in range(1, 13, 3):
        d += 'C%.4f %.4f %.4f %.4f %.4f %.4f' % (*pts[i], *pts[i + 1], *pts[i + 2])
    return d + 'Z'

def parse_transform(tf):
    """Supports rotate(a [cx cy]) and matrix(a b c d e f) → [a b c d e f]."""
    if not tf: return None
    v = [float(x) for x in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', tf)]
    if tf.strip().startswith('matrix'): return v
    if tf.strip().startswith('rotate'):
        a = math.radians(v[0]); cx, cy = (v[1], v[2]) if len(v) > 2 else (0.0, 0.0)
        c, s_ = math.cos(a), math.sin(a)
        return [c, s_, -s_, c, cx - c * cx + s_ * cy, cy - s_ * cx - c * cy]
    raise ValueError('unsupported transform ' + tf)

def apply_affine(m, x, y):
    return m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]

def transform_d(d, m):
    toks = re.findall(r'[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?', d); out, nums = [], []
    for tk in toks:
        if tk in 'MLCZ':
            out.append(tk)
        else:
            nums.append(float(tk))
            if len(nums) == 2:
                out.append('%.4f %.4f' % apply_affine(m, *nums)); nums = []
    return ' '.join(out)

def transformed_paint(p, m):
    """Gradient (userSpaceOnUse) of an element that carries a transform → the same gradient in parent space."""
    if p is None or m is None or p['k'] == 's': return p
    if p['k'] == 'l':
        x1, y1 = apply_affine(m, p['p'][0], p['p'][1]); x2, y2 = apply_affine(m, p['p'][2], p['p'][3])
        return dict(p, p=[x1, y1, x2, y2])
    a, b, c, d, e, f = p['m']; A, B, C, D, E_, F = m
    return dict(p, m=[A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d, A * e + C * f + E_, B * e + D * f + F])

def read_svg(fn):
    root = ET.parse(fn).getroot()
    masks, grads, els = {}, {}, []
    def stops_of(g):
        out = []
        for st in g.findall(SVGNS + 'stop'):
            out.append({'c': hexrgb(st.get('stop-color', '#000000')), 'o': float(st.get('stop-opacity', 1)),
                        'off': float(st.get('offset', 0))})
        return out
    for g in root.iter(SVGNS + 'linearGradient'):
        grads[g.get('id')] = {'k': 'l', 'p': [float(g.get(a)) for a in ('x1', 'y1', 'x2', 'y2')], 'stops': stops_of(g)}
    for g in root.iter(SVGNS + 'radialGradient'):
        cx, cy, r = float(g.get('cx', 0)), float(g.get('cy', 0)), float(g.get('r', 1))
        m = [1, 0, 0, 1, 0, 0]
        gt = g.get('gradientTransform')
        if gt:
            m = [float(v) for v in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', gt)]
        # unit circle → gradient space: gradientTransform · translate(cx,cy) · scale(r)
        a, b, c, d, e, f = m
        grads[g.get('id')] = {'k': 'r', 'm': [a * r, b * r, c * r, d * r, a * cx + c * cy + e, b * cx + d * cy + f],
                              'stops': stops_of(g)}
    for mk in root.iter(SVGNS + 'mask'):
        p = mk.find(SVGNS + 'path'); masks[mk.get('id')] = p.get('d')
    def walk(node):
        for ch in node:
            tag = ch.tag.replace(SVGNS, '')
            if tag in ('defs', 'mask', 'clipPath'):
                continue
            if tag == 'g':
                walk(ch); continue
            if tag == 'path':
                d = ch.get('d')
            elif tag == 'ellipse':
                d = ellipse_d(float(ch.get('cx')), float(ch.get('cy')), float(ch.get('rx')), float(ch.get('ry')), 0.0)
            else:
                continue
            e = {k: ch.get(k) for k in ('fill', 'stroke', 'fill-opacity', 'opacity', 'stroke-width', 'mask')}
            e['tf'] = parse_transform(ch.get('transform'))
            if e['tf'] is not None:
                d = transform_d(d, e['tf'])   # bake the element transform into its points
            e['d'] = d
            if e['mask']:
                e['mask'] = masks[e['mask'][5:-1]]
            els.append(e)
    walk(root)
    return els, grads

def hexrgb(c):
    c = {'white': '#FFFFFF', 'black': '#000000'}.get(c, c)
    return [int(c[i:i+2], 16) for i in (1, 3, 5)]

E1, G1 = read_svg(POSE1); E2, G2 = read_svg(POSE2)
D1 = [e['d'] for e in E1]; D2 = [e['d'] for e in E2]

# ---------- Rig: body parts and the pose-1 → pose-2 element correspondence ----------
# part: (name, parent, anchor in pose 1, [elements]); the first element is used to fit the part's rigid motion.
# element: (pose-1 index or None, pose-2 index) — indices in document order (mask contents excluded).
# Drawing order inside a part follows the list order.
MAXANG = {n: math.radians(80) for n in ('backL', 'backR', 'frontL', 'frontR')}   # legs never flip over
HEAD_FILL = 9   # pose-1 index of the head fill (the head shadow is cast from it)

PARTS = [
  ('backL', 'body', (80, 166), [(0, 0), (None, 1), (1, 2), (2, 3), (3, 4)]),
  ('tail', 'body', (157, 186), [(4, 5)]),
  ('body', None, None, [(5, 6), (6, 7), (8, 9)]),                  # fill, soft gradient, outline
  ('frontL', 'body', (90, 163), [(21, 17), (22, 18)]),
  ('frontR', 'body', (126, 163), [(23, 10), (24, 11)]),
  ('backR', 'body', (160, 166), [(25, 12), (26, 13), (27, 14), (28, 15), (29, 16)]),
  ('head', 'body', (106, 138), [(9, 19), (10, 28), (16, 20), (17, 27),       # fill, outline, shading, top highlight
                                (18, 21), (19, 22), (20, 23),               # nose: fill, highlight, inner outline
                                (30, 29), (31, 30), (32, 31),               # right eye: base, gradient, highlight
                                (33, 24), (34, 25), (35, 26)]),             # left eye
  ('earR', 'head', (136, 47), [(11, 32), (12, 33), (13, 34)]),
  ('earL', 'head', (72, 54), [(14, 35), (15, 36)]),
  # The shadow under the head is cast by the head: it rides in the head's frame and is clipped to the body.
  ('shadow', 'body', (106, 138), [(7, 8)]),
]
FORCE_FIT = {'shadow': 'head'}
EYES = {('head', 30): 'R', ('head', 31): 'R', ('head', 32): 'R', ('head', 33): 'L', ('head', 34): 'L', ('head', 35): 'L'}
EYE_BASE = {30, 33}
FITS = {}

# ---------- Paints ----------
def paint_of(val, G):
    """fill/stroke attribute → {'k': 's', 'c'} | {'k': 'l', 'p', 'stops'} | {'k': 'r', 'm', 'stops'} | None"""
    if not val or val == 'none':
        return None
    if val.startswith('url'):
        return G[val[5:-1]]
    return {'k': 's', 'c': hexrgb(val)}

def as_gradient(p, like):
    """A solid paint expressed as a gradient of the same kind/geometry as `like` (for interpolation)."""
    st = [{'c': p['c'], 'o': 1, 'off': 0}, {'c': p['c'], 'o': 1, 'off': 1}]
    return dict({k: v for k, v in like.items() if k != 'stops'}, stops=st)

def rot_vec(v, R):
    return (np.array(v) @ R.T)

def paint_json(p1, p2, inv, Rl):
    """Interpolatable paint: pose-1 geometry absolute, pose-2 geometry in the part's local frame."""
    if p1 is None: p1 = p2
    if p1['k'] == 's' and p2['k'] == 's':
        return {'k': 's', 'a': p1['c'], 'b': p2['c']}
    if p1['k'] == 's': p1 = as_gradient(p1, dict(p2, **({'p': list(inv(np.array(p2['p']).reshape(2, 2)).ravel())} if p2['k'] == 'l' else {})))
    if p2['k'] == 's': p2 = as_gradient(p2, p1)
    assert p1['k'] == p2['k'] and len(p1['stops']) == len(p2['stops']), 'paint kinds/stops must match'
    r3 = lambda a: [round(float(v), 4) for v in a]
    if p1['k'] == 'l':
        b = inv(np.array(p2['p']).reshape(2, 2)).ravel() if p2 is not p1 else np.array(p2['p'])
        return {'k': 'l', 'a': r3(p1['p']), 'b': r3(b), 'sa': p1['stops'], 'sb': p2['stops']}
    m = p2['m']
    # radial: unit-circle matrix [a b c d e f]; vectors rotate with the part, origin is a point
    vx = rot_vec([m[0], m[1]], Rl); vy = rot_vec([m[2], m[3]], Rl); o = inv(np.array([[m[4], m[5]]]))[0]
    return {'k': 'r', 'a': r3(p1['m']), 'b': r3([vx[0], vx[1], vy[0], vy[1], o[0], o[1]]), 'sa': p1['stops'], 'sb': p2['stops']}

def num(v, default=1.0):
    return float(v) if v is not None else default

# Front legs: they rotate rigidly at the shoulder; mid-move their outlines are trimmed where they enter
# the body silhouette (done in the morph core), so the leg reads as coming out of the body.
FRONT_LEGS = ('frontL', 'frontR')

out = {'parts': []}
for name, parent, anchor, els in PARTS:
    i1, i2 = els[0]
    sA, cA = parse(D1[i1]); sB, cB = parse(D2[i2])
    if name in FORCE_FIT:
        th, R, t, err = FITS[FORCE_FIT[name]]
    else:
        th, R, t, err = best_fit(sA, sB, cA, MAXANG.get(name, math.pi))
    FITS[name] = (th, R, t, err)
    if anchor is None:
        anchor = sample(sA).mean(0)
    A1 = np.array(anchor, float); A2 = R @ A1 + t
    inv = lambda Y: (Y - t) @ R            # pose-2 absolute → part-local (pose-1 frame)
    Rl = R.T                                 # rotation pose-2 → local, for vectors
    part = {'name': name, 'parent': parent, 'A1': [round(float(v), 3) for v in A1],
            'A2': [round(float(v), 3) for v in A2], 'th': round(th, 5), 'err': round(float(err), 2), 'els': []}
    shapes = {}                               # pose-2 index → element dict, for mask references
    for (j1, j2) in els:
        e1 = E1[j1] if j1 is not None else None; e2 = E2[j2]
        sb, cb = parse(D2[j2])
        sb_local = [inv(s_) for s_ in sb]
        if j1 is None:
            # grows in from its own midpoint
            Bm = subdivide(sb_local, max(len(sb_local), 4))
            c = sample(Bm).mean(0)
            A = [np.array([c, c, c, c]) for _ in Bm]
            closed = cb
        else:
            sa, ca = parse(D1[j1])
            closed = ca and cb
            A, Bm = match(sa, sb_local, closed)
        el = {'a': flat(A), 'b': flat(Bm), 'z': bool(closed), 'grow': j1 is None}
        src1 = e1 or e2
        f1 = transformed_paint(paint_of(src1['fill'], G1 if e1 else G2), src1['tf'])
        f2 = transformed_paint(paint_of(e2['fill'], G2), e2['tf'])
        s1 = transformed_paint(paint_of(src1['stroke'], G1 if e1 else G2), src1['tf'])
        s2 = transformed_paint(paint_of(e2['stroke'], G2), e2['tf'])
        if e1 is None:   # a grown element uses its pose-2 paint in both poses, in the local frame
            if f1 and f1['k'] == 'l': f1 = dict(f1, p=list(inv(np.array(f1['p']).reshape(2, 2)).ravel()))
            if s1 and s1['k'] == 'l': s1 = dict(s1, p=list(inv(np.array(s1['p']).reshape(2, 2)).ravel()))
        if f2: el['fill'] = paint_json(f1, f2, inv, Rl)
        if s2:
            el['stroke'] = paint_json(s1, s2, inv, Rl)
            el['sw'] = num(e2['stroke-width'], 1)
        el['fo'] = [num(src1['fill-opacity']), num(e2['fill-opacity'])]
        el['op'] = [num(src1['opacity']), num(e2['opacity'])]
        if e2['mask']:
            # mask = the shape of another element of this part (the nose): becomes a clip by that shape
            ref = [k for k, (q1, q2) in enumerate(els) if D2[q2] == e2['mask']]
            assert ref, 'mask shape not found among the part elements'
            el['clip'] = ref[0]
        if j1 is not None and (name, j1) in EYES:
            el['eye'] = EYES[(name, j1)]
            if j1 in EYE_BASE: el['eyeBase'] = 1
        if name == 'shadow':
            el['over'] = 1   # drawn over the front-leg shoulders so they shade like the chest
            # Mid-move the shadow is the head outline pushed DROP px toward the body (a crescent along the
            # side of the head that faces the body). Near the poses it blends into the original shapes.
            DROP = 9.0
            hs_raw, _ = parse(D1[HEAD_FILL])                   # head fill, pose 1 = head-local frame
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
        pieces = [el]
        if name in FRONT_LEGS and 'stroke' in el and not el['z']:
            # A front-leg outline runs inner top → paw → outer top. It is split at the paw into two open lines,
            # each with its own gradient attachment, so the gradient follows each side of the leg.
            pa = np.array(el['a']).reshape(-1, 2); nv = (len(pa) - 1) // 3
            kv = max(range(nv + 1), key=lambda q: pa[3 * q][1])          # lowest on-curve vertex = paw
            def cut(arr, lo, hi): return arr[2 * lo:2 * hi + 2]
            h1 = dict(el, a=cut(el['a'], 0, 3 * kv), b=cut(el['b'], 0, 3 * kv))
            h2 = dict(el, a=cut(el['a'], 3 * kv, len(pa) - 1), b=cut(el['b'], 3 * kv, len(pa) - 1))
            for h in (h1, h2):
                h['stroke'] = json.loads(json.dumps(el['stroke']))
            pieces = [h1, h2]
        for el in pieces:
            g = el.get('stroke')
            if name in FRONT_LEGS and g and g['k'] == 'l':
                # gradient endpoints ride on the stroke itself: nearest stroke point in each pose + offset
                pa = np.array(el['a']).reshape(-1, 2); pb = np.array(el['b']).reshape(-1, 2); P2abs = pb @ R.T + t
                q1 = np.array(g['a']).reshape(2, 2); q2 = np.array(g['b']).reshape(2, 2) @ R.T + t
                g['att'] = []
                for k in range(2):
                    k1 = int(np.argmin(np.sum((pa - q1[k])**2, 1))); k2 = int(np.argmin(np.sum((P2abs - q2[k])**2, 1)))
                    g['att'].append([k1, k2, *[round(float(v), 3) for v in q1[k] - pa[k1]], *[round(float(v), 3) for v in q2[k] - P2abs[k2]]])
            part['els'].append(el)
    out['parts'].append(part)
    print(f"{name:7s} th={math.degrees(th):7.1f}  err={err:7.2f}  A1={A1.round(1)} A2={A2.round(1)}")

json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print('bytes', len(json.dumps(out, separators=(',', ':'))))
