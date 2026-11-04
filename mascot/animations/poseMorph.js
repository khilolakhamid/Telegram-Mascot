/**
 * Pose morph core for the PawMotion dog.
 *
 * Interpolates every element of the dog between pose 1 (sitting) and pose 2 (playful bow):
 * each body part moves along a rigid transform (rotation + carried anchor) while its contour
 * morphs between matched cubic-Bézier point sets. Shoulders are skinned to the body, the
 * gradient strokes stay attached to their ends, and the head shadow is cast by the head.
 *
 * Input data (dogMorphData.json) is generated from the two SVGs by tools/build_morph_data.py.
 */
const smooth = u => { u = Math.min(1, Math.max(0, u)); return u * u * u * (u * (u * 6 - 15) + 10); };

// Per-part timing inside the transition (0..1): start, end. Head/front lead, rear and tail follow.
const TIMING = {
  body:   [0.00, 0.90],
  head:   [0.04, 0.92],
  earR:   [0.10, 1.00],
  earL:   [0.08, 0.98],
  frontL: [0.02, 0.86],
  frontR: [0.04, 0.88],
  backL:  [0.10, 0.96],
  backR:  [0.10, 0.96],
  tail:   [0.16, 1.00],
  shadow: [0.04, 0.92]    // same timing as the head that casts it
};

// How much a part's attachment point travels in a straight line (1) instead of being carried
// along the body's rotation arc (0). Legs behind the body take the short path so they stay hidden.
const ANCHOR_LINEAR = { backL: 1, backR: 0.6, frontL: 0.5, frontR: 0.5, tail: 0, head: 0, earR: 0, earL: 0 };

function makeRig(DATA) {
  const parts = {};
  DATA.parts.forEach(p => parts[p.name] = p);
  return { DATA, parts };
}

// Rigid transform of a part at global transition progress g. Returns {M(x,y), t (local progress)}
function solve(rig, g) {
  const res = {};
  const get = name => {
    if (res[name]) return res[name];
    const p = rig.parts[name], tm = TIMING[name];
    const t = smooth((g - tm[0]) / (tm[1] - tm[0]));
    let ax, ay;
    if (!p.parent) {
      ax = p.A1[0] + (p.A2[0] - p.A1[0]) * t;
      ay = p.A1[1] + (p.A2[1] - p.A1[1]) * t;
    } else {
      const par = get(p.parent);
      // anchor expressed in parent frame at pose2, interpolated, then carried by the parent
      const q = par.inv1(p.A2[0], p.A2[1]);
      const lx = p.A1[0] + (q[0] - p.A1[0]) * t, ly = p.A1[1] + (q[1] - p.A1[1]) * t;
      [ax, ay] = par.M(lx, ly);
      const w = ANCHOR_LINEAR[name] || 0;
      if (w) {
        ax = ax * (1 - w) + (p.A1[0] + (p.A2[0] - p.A1[0]) * t) * w;
        ay = ay * (1 - w) + (p.A1[1] + (p.A2[1] - p.A1[1]) * t) * w;
      }
    }
    const a = p.th * t, c = Math.cos(a), s = Math.sin(a);
    const c1 = Math.cos(p.th), s1 = Math.sin(p.th);
    const A1 = p.A1, A2 = p.A2;
    const r = {
      t, ang: a,
      M: (x, y) => { const dx = x - A1[0], dy = y - A1[1]; return [c * dx - s * dy + ax, s * dx + c * dy + ay]; },
      // inverse of the full (t=1) transform
      inv1: (x, y) => { const dx = x - A2[0], dy = y - A2[1]; return [c1 * dx + s1 * dy + A1[0], -s1 * dx + c1 * dy + A1[1]]; }
    };
    res[name] = r; return r;
  };
  Object.keys(rig.parts).forEach(get);
  return res;
}

const lerp = (a, b, t) => a + (b - a) * t;
const FILL = [249, 249, 249];
const f = v => Math.round(v * 100) / 100;

// Point i of a part: carried by the part, or — for skinned shoulder points — blended with the body.
function pt(a, b, bb, w, i, T, B) {
  let [x, y] = T.M(lerp(a[i], b[i], T.t), lerp(a[i + 1], b[i + 1], T.t));
  const k = bb ? w[i >> 1] : 0;
  if (k > 0) {
    const u = lerp(a[i], bb[i], T.t), v = lerp(a[i + 1], bb[i + 1], T.t);
    x += (u - x) * k; y += (v - y) * k;
  }
  return [x, y];
}

// Shadow under the head: head outline pushed toward the body mid-move, original shapes at the poses.
function shadowD(el, T, B, P) {
  const t = T.t, hc = T.M(el.hc[0], el.hc[1]), bc = B.M(el.bc[0], el.bc[1]);
  let dx = bc[0] - hc[0], dy = bc[1] - hc[1]; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
  const c = Math.cos(-T.ang), s = Math.sin(-T.ang);
  const vx = el.drop * (c * dx - s * dy), vy = el.drop * (s * dx + c * dy);
  const m = Math.sin(Math.PI * t), k1 = (1 - m) * (1 - t), k2 = (1 - m) * t;
  let d = '';
  for (let i = 0, j = 0; i < el.hs.length; i += 2, j++) {
    const lx = el.hs[i] + vx + k1 * el.d1[i] + k2 * el.d2[i];
    const ly = el.hs[i + 1] + vy + k1 * el.d1[i + 1] + k2 * el.d2[i + 1];
    const [x, y] = T.M(lx, ly);
    if (P) P.push(x, y);
    d += (j === 0 ? 'M' : (j % 3 === 1 ? 'C' : ' ')) + f(x) + ' ' + f(y);
  }
  return el.z ? d + 'Z' : d;
}

function pathD(el, T, B, P) {
  if (el.hs) return shadowD(el, T, B, P);
  let a = el.a;
  if (el.a2) {   // pose-1 detail that retracts during the first part of a pose change
    const r = smooth(T.t / 0.3);
    a = r > 0 ? el.a.map((v, i) => lerp(v, el.a2[i], r)) : el.a;
  }
  let d = '';
  for (let i = 0, k = 0; i < a.length; i += 2, k++) {
    const [x, y] = pt(a, el.b, el.bb, el.w, i, T, B);
    if (P) P.push(x, y);
    d += (k === 0 ? 'M' : (k % 3 === 1 ? 'C' : ' ')) + f(x) + ' ' + f(y);
  }
  return el.z ? d + 'Z' : d;
}

function convexHull(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

function color(c1, c2, t) {
  return 'rgb(' + [0, 1, 2].map(i => Math.round(lerp(c1[i], c2[i], t))).join(',') + ')';
}

// Returns a list of per-element render states for progress g in [0,1]
function frame(rig, g) {
  const T = solve(rig, g), out = [];
  rig.DATA.parts.forEach(p => {
    const tr = T[p.name];
    p.els.forEach(el => {
      const t = tr.t, P = [], o = { part: p.name, layer: el.over ? 'bodyOver' : p.name, d: pathD(el, tr, T.body, P) };
      o.opacity = el.grow ? smooth((t - 0.35) / 0.55) : 1;
      if (el.fill) { o.fill = 'rgb(' + el.fill.join(',') + ')'; o.fo = lerp(el.fo[0], el.fo[1], t); }
      if (el.sc) o.stroke = color(el.sc[0], el.sc[1], t);
      if (el.g) {
        const g1 = el.g, pts = [];
        if (g1.att) {
          // endpoints attached to the stroke: vertex in pose 1 / pose 2 + offset, blended
          g1.att.forEach(([i1, i2, ox1, oy1, ox2, oy2]) => {
            const x1 = P[2 * i1] + ox1, y1 = P[2 * i1 + 1] + oy1, x2 = P[2 * i2] + ox2, y2 = P[2 * i2 + 1] + oy2;
            pts.push(lerp(x1, x2, t), lerp(y1, y2, t));
          });
        } else for (let i = 0; i < 4; i += 2) pts.push(...tr.M(lerp(g1.a[i], g1.b[i], t), lerp(g1.a[i + 1], g1.b[i + 1], t)));
        const bump = g1.att ? 0.85 * Math.sin(Math.PI * t) : 0;   // 0 at both poses
        o.grad = { p: pts, stops: g1.sa.map((s, i) => {
          const c = s.c.map((v, k) => lerp(v, g1.sb[i].c[k], t));
          const fade = i === g1.sh ? bump : 0;               // shoulder end dissolves into the body colour
          return { c: color(c, FILL, fade), o: lerp(lerp(s.o, g1.sb[i].o, t), 1, fade), off: lerp(s.off, g1.sb[i].off, t) };
        }) };
      }
      o.P = P; o.w = el.w;
      out.push(o);
    });
  });
  // Shoulder bridge: body-coloured fill spanning the tops of both front legs, under the legs.
  // It hides the chest contour that would otherwise peek between the shoulders mid-move; invisible in both poses.
  const sh = [];
  out.forEach(e => { if ((e.part === 'frontL' || e.part === 'frontR') && e.fill && e.w) e.P.forEach((v, i) => { if (i % 2 === 0 && e.w[i >> 1] > 0.2) sh.push([v, e.P[i + 1]]); }); });
  const hull = convexHull(sh), tb = T.frontR.t;
  out.push({ part: 'bridge', layer: 'bridge', fill: 'rgb(249,249,249)', fo: 1, opacity: Math.min(1, 3 * Math.sin(Math.PI * tb)),
             d: hull.length > 2 ? 'M' + hull.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z' : 'M0 0' });
  // render order: the bridge goes right after the front legs
  const over = out.filter(e => e.layer === 'bodyOver'), bridge = out.filter(e => e.layer === 'bridge');
  const rest = out.filter(e => e.layer !== 'bodyOver' && e.layer !== 'bridge');
  rest.splice(rest.map(e => e.part).indexOf('frontL'), 0, ...bridge);
  rest.splice(rest.map(e => e.part).lastIndexOf('frontR') + 1, 0, ...over);
  out.forEach(e => { if (e.layer !== 'bodyOver') delete e.P; delete e.w; });
  return { els: rest, T };
}

export const PoseMorph = { makeRig, frame, solve, smooth, TIMING, ANCHOR_LINEAR };
