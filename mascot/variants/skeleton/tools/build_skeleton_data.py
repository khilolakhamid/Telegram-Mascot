"""Builds the Skeleton Dog morph data (../animations/skeletonMorphData.json) from
../assets/skeleton-pose-1.svg and ../assets/skeleton-pose-2.svg.

Run:  python3 mascot/variants/skeleton/tools/build_skeleton_data.py   (Python 3 + numpy)
      add --list to print every element of both poses (index, paint, bbox) for mapping work.

For every element the output holds matched cubic-Bezier point arrays (pose 1 absolute,
pose 2 in the body part's local frame), interpolatable paints, blur (glow) amounts and
per-part rigid motion. The Skeleton Dog is its own model: this builder, its data and its
engine are separate from the Original Dog's.
"""
import re, json, math, os, sys
import xml.etree.ElementTree as ET
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
POSE1 = os.path.join(HERE, '..', 'assets', 'skeleton-pose-1.svg')
POSE2 = os.path.join(HERE, '..', 'assets', 'skeleton-pose-2.svg')
OUT = os.path.join(HERE, '..', 'animations', 'skeletonMorphData.json')
# Motion reference: the Original Dog's part motions (read only). Every skeleton part moves exactly like the
# same part of the Original Dog (rotation and attachment path); only the shapes differ.
REFERENCE = os.path.join(HERE, '..', '..', '..', 'animations', 'dogMorphData.json')
SVGNS = '{http://www.w3.org/2000/svg}'

# ---------- geometry ----------
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


# ---------- SVG reading ----------
NUM = r'-?\d*\.?\d+(?:e[-+]?\d+)?'

def mat_mul(A, B):
    """Affine [a b c d e f] composition A·B (B applied first)."""
    a, b, c, d, e, f = A; g, h, i, j, k, l = B
    return [a * g + c * h, b * g + d * h, a * i + c * j, b * i + d * j, a * k + c * l + e, b * k + d * l + f]

def parse_transform(tf):
    """SVG transform list (translate, rotate, scale, matrix) → affine [a b c d e f], or None."""
    if not tf: return None
    m = [1, 0, 0, 1, 0, 0]
    for name, args in re.findall(r'(\w+)\s*\(([^)]*)\)', tf):
        v = [float(x) for x in re.findall(NUM, args)]
        if name == 'matrix': t = v
        elif name == 'translate': t = [1, 0, 0, 1, v[0], v[1] if len(v) > 1 else 0.0]
        elif name == 'scale': t = [v[0], 0, 0, v[1] if len(v) > 1 else v[0], 0, 0]
        elif name == 'rotate':
            a = math.radians(v[0]); c, s_ = math.cos(a), math.sin(a)
            cx, cy = (v[1], v[2]) if len(v) > 2 else (0.0, 0.0)
            t = [c, s_, -s_, c, cx - c * cx + s_ * cy, cy - s_ * cx - c * cy]
        else: raise ValueError('unsupported transform ' + name)
        m = mat_mul(m, t)
    return m

def apply_affine(m, x, y):
    return m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]

def transform_d(d, m):
    toks = re.findall(r'[MLCZ]|' + NUM, d); out, nums = [], []
    for tk in toks:
        if tk in 'MLCZ': out.append(tk)
        else:
            nums.append(float(tk))
            if len(nums) == 2: out.append('%.4f %.4f' % apply_affine(m, *nums)); nums = []
    return ' '.join(out)

def ellipse_d(cx, cy, rx, ry):
    k = 0.5522847498
    q = [(rx, 0), (rx, k * ry), (k * rx, ry), (0, ry), (-k * rx, ry), (-rx, k * ry), (-rx, 0),
         (-rx, -k * ry), (-k * rx, -ry), (0, -ry), (k * rx, -ry), (rx, -k * ry), (rx, 0)]
    pts = [(cx + x, cy + y) for x, y in q]
    d = 'M%.4f %.4f' % pts[0]
    for i in range(1, 13, 3): d += 'C%.4f %.4f %.4f %.4f %.4f %.4f' % (*pts[i], *pts[i + 1], *pts[i + 2])
    return d + 'Z'

def hexrgb(c):
    c = {'white': '#FFFFFF', 'black': '#000000'}.get(c, c)
    return [int(c[i:i + 2], 16) for i in (1, 3, 5)]

def read_svg(fn):
    root = ET.parse(fn).getroot()
    masks, grads, blurs, els = {}, {}, {}, []
    def stops_of(g):
        return [{'c': hexrgb(st.get('stop-color', '#000000')), 'o': float(st.get('stop-opacity', 1)),
                 'off': float(st.get('offset', 0))} for st in g.findall(SVGNS + 'stop')]
    for g in root.iter(SVGNS + 'linearGradient'):
        grads[g.get('id')] = {'k': 'l', 'p': [float(g.get(a)) for a in ('x1', 'y1', 'x2', 'y2')], 'stops': stops_of(g)}
    for g in root.iter(SVGNS + 'radialGradient'):
        cx, cy, r = float(g.get('cx', 0)), float(g.get('cy', 0)), float(g.get('r', 1))
        m = parse_transform(g.get('gradientTransform')) or [1, 0, 0, 1, 0, 0]
        grads[g.get('id')] = {'k': 'r', 'm': mat_mul(m, [r, 0, 0, r, cx, cy]), 'stops': stops_of(g)}   # unit circle → space
    for f in root.iter(SVGNS + 'filter'):
        gb = f.find(SVGNS + 'feGaussianBlur'); blurs[f.get('id')] = float(gb.get('stdDeviation'))
    for mk in root.iter(SVGNS + 'mask'):
        masks[mk.get('id')] = mk.find(SVGNS + 'path').get('d')
    def walk(node, blur):
        for ch in node:
            tag = ch.tag.replace(SVGNS, '')
            if tag in ('defs', 'mask', 'clipPath'): continue
            if tag == 'g':
                f = ch.get('filter'); walk(ch, blurs[f[5:-1]] if f else blur); continue
            if tag == 'path': d = ch.get('d')
            elif tag == 'ellipse': d = ellipse_d(float(ch.get('cx')), float(ch.get('cy')), float(ch.get('rx')), float(ch.get('ry')))
            elif tag == 'circle': d = ellipse_d(float(ch.get('cx')), float(ch.get('cy')), float(ch.get('r')), float(ch.get('r')))
            else: continue
            e = {k: ch.get(k) for k in ('fill', 'stroke', 'fill-opacity', 'opacity', 'stroke-width', 'mask')}
            e['tf'] = parse_transform(ch.get('transform'))
            if e['tf'] is not None: d = transform_d(d, e['tf'])   # element transform baked into the points
            e['d'] = d; e['blur'] = blur
            if e['mask']: e['mask'] = masks[e['mask'][5:-1]]
            els.append(e)
    walk(root, 0.0)
    return els, grads

E1, G1 = read_svg(POSE1); E2, G2 = read_svg(POSE2)

# Size corrections approved for the model: {(pose, index): factor}. The shape is scaled about the centre of
# its bounding box, so it keeps its place and proportions; both poses get the same factor.
SHAPE_SCALE = {(1, 20): 0.75, (2, 19): 0.75}   # chest bone (v1)
def scale_about_center(d, k):
    v = np.array([float(x) for x in re.findall(NUM, d)]).reshape(-1, 2)
    c = (v.min(0) + v.max(0)) / 2
    return transform_d(d, [k, 0, 0, k, c[0] * (1 - k), c[1] * (1 - k)])
for (pose, i), k in SHAPE_SCALE.items():
    E = E1 if pose == 1 else E2
    E[i]['d'] = scale_about_center(E[i]['d'], k)
D1 = [e['d'] for e in E1]; D2 = [e['d'] for e in E2]

def bbox(d):
    v = np.array([float(x) for x in re.findall(NUM, d)]).reshape(-1, 2); return v.min(0), v.max(0)

if '--list' in sys.argv:
    for n, (E, G) in enumerate([(E1, G1), (E2, G2)]):
        print('POSE', n + 1)
        for i, e in enumerate(E):
            lo, hi = bbox(e['d'])
            print(f"{i:2d} fill={e['fill']} stroke={e['stroke']} sw={e['stroke-width']} op={e['opacity']} fo={e['fill-opacity']}"
                  f" blur={e['blur']:g} mask={'Y' if e['mask'] else '-'} bbox={lo.round(0)}-{hi.round(0)}")
    sys.exit(0)

# ---------- Rig ----------
# part: (name, parent, anchor in pose 1, [elements]); the part's rigid motion comes from the reference.
# element: (pose-1 index, pose-2 index, options) — indices in document order (mask contents excluded).
# Drawing order inside a part follows the list. Options: 'top' — body element drawn above the head shadow;
# 'face' — head element drawn above the ears.
HEAD_FILL = 40

PARTS = [
  ('backL', 'body', (80, 166), [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4)]),           # leg, outline, paw, paw bone, paw outline
  ('tail', 'body', (157, 186), [(5, 5), (6, 6), (7, 7), (8, 8), (9, 9)]),            # tail, glow, 3 vertebrae
  ('body', None, None, [(10, 10), (12, 12), (13, 11),                                # fill, 2 glows
                        (14, 13), (15, 14), (16, 15), (17, 16),                      # ribs
                        (19, 17, 'top'), (11, 18, 'top')]),                          # outline, hip bone
  # chest bone (v1): carried inside the body, but it keeps its own orientation (it barely turns between the
  # poses), so it morphs into its new shape instead of spinning with the body's 114° turn
  ('chestBone', 'body', None, [(20, 19, 'top')]),
  ('frontL', 'body', (90, 163), [(21, 21), (22, 22), (26, 23), (23, 24), (24, 25), (25, 26)]),   # leg, glow, outline, pad, toe, bone
  ('frontR', 'body', (126, 163), [(27, 27), (28, 28), (29, 29), (30, 30), (31, 31), (32, 32)]),
  ('backR', 'body', (160, 166), [(33, 33), (34, 34), (35, 35), (36, 36), (38, 37), (39, 38), (37, 39)]),
  # head fill and outline sit under the ears; the face (muzzle, nose, eyes) is drawn above the ears
  ('head', 'body', (106, 138), [(40, 40), (41, 51),                                 # fill, outline
                                (48, 41, 'face'), (49, 42, 'face'), (50, 50, 'face'),   # muzzle, rim, shine
                                (51, 43, 'face'), (52, 44, 'face'), (53, 45, 'face'),   # nose: fill, highlight, rim
                                (54, 52, 'face'), (55, 53, 'face'), (60, 54, 'face'), (61, 55, 'face'),   # right eye
                                (56, 46, 'face'), (57, 47, 'face'), (58, 48, 'face'), (59, 49, 'face')]), # left eye
  ('earR', 'head', (136, 47), [(42, 56), (43, 57), (44, 58)]),
  ('earL', 'head', (72, 54), [(45, 59), (46, 60), (47, 61)]),
  # the shadow under the head is cast by the head: it rides in the head's frame and is clipped to the body
  ('shadow', 'body', (106, 138), [(18, 20)]),
]
OWN_MOTION = {'chestBone'}   # parts not in the Original Dog: motion fitted to their own shapes
EYES = {54: 'R', 55: 'R', 60: 'R', 61: 'R', 56: 'L', 57: 'L', 58: 'L', 59: 'L'}
EYE_BASE = {54, 56}
# pose 1 draws the head twice (fill+outline, then the same again); keep one fill and one outline
OVERRIDE1 = {40: {'stroke': None, 'stroke-width': None}, 41: {'fill': None}}
for i, ov in OVERRIDE1.items(): E1[i].update(ov)

# ---------- Paints ----------
def paint_of(val, G):
    if not val or val == 'none': return None
    if val.startswith('url'): return G[val[5:-1]]
    return {'k': 's', 'c': hexrgb(val)}

def transformed_paint(p, m):
    if p is None or m is None or p['k'] == 's': return p
    if p['k'] == 'l':
        x1, y1 = apply_affine(m, p['p'][0], p['p'][1]); x2, y2 = apply_affine(m, p['p'][2], p['p'][3])
        return dict(p, p=[x1, y1, x2, y2])
    return dict(p, m=mat_mul(m, p['m']))

def paint_json(p1, p2, inv, Rl):
    """Interpolatable paint (same kind in both poses): pose-1 geometry absolute, pose-2 in the part's local frame."""
    r3 = lambda a: [round(float(v), 4) for v in a]
    if p1['k'] == 's' and p2['k'] == 's': return {'k': 's', 'a': p1['c'], 'b': p2['c']}
    solid_as = lambda s_, like: dict({k: v for k, v in like.items() if k != 'stops'},
                                     stops=[{'c': s_['c'], 'o': 1, 'off': 0}, {'c': s_['c'], 'o': 1, 'off': 1}])
    loc = lambda p: dict(p, p=list(inv(np.array(p['p']).reshape(2, 2)).ravel())) if p['k'] == 'l' else \
        dict(p, m=[*(np.array(p['m'][:2]) @ Rl.T), *(np.array(p['m'][2:4]) @ Rl.T), *inv(np.array([p['m'][4:6]]))[0]])
    if p1['k'] == 's': p1 = solid_as(p1, p2)          # p2 geometry is absolute pose 2 here → fine as both poses use it
    if p2['k'] == 's': p2 = solid_as(p2, p1)
    assert p1['k'] == p2['k'] and len(p1['stops']) == len(p2['stops'])
    b = loc(p2)
    if p1['k'] == 'l': return {'k': 'l', 'a': r3(p1['p']), 'b': r3(b['p']), 'sa': p1['stops'], 'sb': p2['stops']}
    return {'k': 'r', 'a': r3(p1['m']), 'b': r3(b['m']), 'sa': p1['stops'], 'sb': p2['stops']}

def num(v, default=1.0):
    return float(v) if v is not None else default

# ---------- Build ----------
out = {'parts': []}
REF = {p['name']: p for p in json.load(open(REFERENCE))['parts']}
for name, parent, anchor, els in PARTS:
    i1, i2 = els[0][:2]
    sA, cA = parse(D1[i1]); sB, cB = parse(D2[i2])
    if name in OWN_MOTION:
        # own rigid motion fitted to its two drawn shapes; anchor = its centre (the parent carries the anchor)
        th, R, t, _ = best_fit(sA, sB, cA)
        A1 = sample(sA).mean(0); A2 = R @ A1 + t
    else:
        ref = REF[name]
        th = ref['th']; R = np.array([[math.cos(th), -math.sin(th)], [math.sin(th), math.cos(th)]])
        A1 = np.array(ref['A1'], float); A2 = np.array(ref['A2'], float); t = A2 - R @ A1
        if anchor is not None: assert np.allclose(A1, anchor), f'{name}: anchor differs from the reference'
    # how far the skeleton's own pose-2 shape is from the reference motion (absorbed by the contour morph)
    Xs = sample(sA) @ R.T + t; err = float(np.mean(np.min(np.sum((Xs[:, None] - sample(sB)[None])**2, 2), 1)))
    inv = lambda Y: (Y - t) @ R            # pose-2 absolute → part-local (pose-1 frame)
    Rl = R.T
    part = {'name': name, 'parent': parent, 'A1': [round(float(v), 3) for v in A1],
            'A2': [round(float(v), 3) for v in A2], 'th': round(th, 5), 'err': round(float(err), 2), 'els': []}
    specs = []
    for spec in els:
        j1, j2 = spec[:2]; opts = spec[2:]
        e1, e2 = E1[j1], E2[j2]
        sa, ca = parse(D1[j1]); sb, cb = parse(D2[j2])
        closed = ca and cb
        A, Bm = match(sa, [inv(s_) for s_ in sb], closed)
        base = {'a': flat(A), 'b': flat(Bm), 'z': bool(closed), 'grow': False,
                'fo': [num(e1['fill-opacity']), num(e2['fill-opacity'])], 'blur': [e1['blur'], e2['blur']]}
        if 'top' in opts: base['sub'] = 'top'
        if 'face' in opts: base['sub'] = 'face'
        f1 = transformed_paint(paint_of(e1['fill'], G1), e1['tf']); f2 = transformed_paint(paint_of(e2['fill'], G2), e2['tf'])
        s1 = transformed_paint(paint_of(e1['stroke'], G1), e1['tf']); s2 = transformed_paint(paint_of(e2['stroke'], G2), e2['tf'])
        assert (f1 is None) == (f2 is None) and (s1 is None) == (s2 is None), f'paint presence differs: {name} {j1}/{j2}'
        op = [num(e1['opacity']), num(e2['opacity'])]
        pieces = []
        if f1 and f1['k'] != 's' and f2['k'] != 's' and f1['k'] != f2['k']:
            # the gradient kind changes between the poses (radial ↔ linear): cross-fade two copies of the
            # morphing shape, each keeping its own gradient carried by the part
            loc1 = paint_json(f1, f1 if f1['k'] == 'l' else f1, lambda Y: Y, np.eye(2))     # pose-1 paint, fixed in the part
            loc2 = paint_json(f2, f2, inv, Rl); loc2 = dict(loc2, a=loc2['b'])               # pose-2 paint, fixed in the part
            pieces.append(dict(base, fill=loc1, op=[op[0], 0.0]))
            pieces.append(dict(base, fill=loc2, op=[0.0, op[1]]))
        else:
            el = dict(base, op=op)
            if f1: el['fill'] = paint_json(f1, f2, inv, Rl)
            if s1:
                el['stroke'] = paint_json(s1, s2, inv, Rl)
                el['sw'] = [num(e1['stroke-width'], 1), num(e2['stroke-width'], 1)]
            pieces.append(el)
        for el in pieces:
            if e2['mask']:
                # mask = the shape of another element of this part → clip by that element's current shape
                ref = [k for k, sp in enumerate(els) if D2[sp[1]] == e2['mask']]
                assert ref, f'mask shape not found in part {name}'
                el['clipSpec'] = ref[0]             # resolved to the output index once the part is complete
            if name == 'head' and j1 in EYES:
                el['eye'] = EYES[j1]
                if j1 in EYE_BASE: el['eyeBase'] = 1
            if name == 'shadow':
                el['over'] = 1
                # mid-move the shadow is the head outline pushed DROP px toward the body; near the poses it
                # blends into the two drawn shapes
                DROP = 9.0
                hs_raw, _ = parse(D1[HEAD_FILL])
                Hs = subdivide(hs_raw, len(A)); bestc = None
                for rev in (False, True):
                    HH = rev_segs(Hs) if rev else Hs
                    for k in range(len(HH)):
                        C = HH[k:] + HH[:k]
                        cost = sum(np.sum((C[q][0] - A[q][0])**2) for q in range(len(A)))
                        if bestc is None or cost < bestc[0]: bestc = (cost, C)
                Hs = bestc[1]; hc1 = sample(hs_raw).mean(0)
                bodyp = out['parts'][[p['name'] for p in out['parts']].index('body')]
                bc1, bc2 = np.array(bodyp['A1']), np.array(bodyp['A2'])
                def vloc(hc, bc, ang):
                    d = (bc - hc) / np.linalg.norm(bc - hc); c_, s_ = math.cos(-ang), math.sin(-ang)
                    return DROP * np.array([c_ * d[0] - s_ * d[1], s_ * d[0] + c_ * d[1]])
                v0 = vloc(hc1, bc1, 0.0); v1 = vloc(R @ hc1 + t, bc2, th)
                hsf = np.array(flat(Hs)).reshape(-1, 2)
                el['hs'] = [round(float(x), 3) for x in hsf.ravel()]
                el['d1'] = [round(float(x), 3) for x in (np.array(el['a']).reshape(-1, 2) - hsf - v0).ravel()]
                el['d2'] = [round(float(x), 3) for x in (np.array(el['b']).reshape(-1, 2) - hsf - v1).ravel()]
                el['hc'] = [round(float(x), 3) for x in hc1]; el['bc'] = [round(float(x), 3) for x in bc1]; el['drop'] = DROP
            specs.append(els.index(spec)); part['els'].append(el)
    first_out = {}                                  # spec index → index of its first output element
    for k, sp in enumerate(specs): first_out.setdefault(sp, k)
    for el in part['els']:
        if 'clipSpec' in el: el['clip'] = first_out[el.pop('clipSpec')]
    out['parts'].append(part)
    print(f"{name:7s} th={math.degrees(th):7.1f}  err={err:7.2f}  A1={A1.round(1)} A2={A2.round(1)}  elements={len(part['els'])}")

json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print('bytes', len(json.dumps(out, separators=(',', ':'))))
