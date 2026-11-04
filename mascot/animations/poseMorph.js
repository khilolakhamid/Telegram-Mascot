/**
 * Pose morph core for the PawMotion dog.
 *
 * Interpolates every element of the dog between pose 1 (sitting) and pose 2 (playful bow):
 * each body part moves along a rigid transform (rotation + carried anchor) while its contour
 * morphs between matched cubic-Bézier point sets. Fills and strokes may be solid colours or
 * linear/radial gradients; their geometry rides with the part. Front legs rotate rigidly at the
 * shoulder with their full outlines; the head shadow is cast by the head.
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
const f = v => Math.round(v * 100) / 100;

// Point i of an element, carried by its part.
const pt = (a, b, i, T) => T.M(lerp(a[i], b[i], T.t), lerp(a[i + 1], b[i + 1], T.t));

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
  const a = el.a;
  const Q = [];
  for (let i = 0; i < a.length; i += 2) Q.push(pt(a, el.b, i, T));
  if (P) Q.forEach(q => P.push(q[0], q[1]));
  let d = '';
  Q.forEach(([x, y], k) => { d += (k === 0 ? 'M' : (k % 3 === 1 ? 'C' : ' ')) + f(x) + ' ' + f(y); });
  return el.z ? d + 'Z' : d;
}

function color(c1, c2, t) {
  return 'rgb(' + [0, 1, 2].map(i => Math.round(lerp(c1[i], c2[i], t))).join(',') + ')';
}

// Paint at local progress t: solid colour, linear gradient (endpoints) or radial gradient (unit-circle matrix).
// Geometry: pose 1 absolute, pose 2 in the part's local frame → interpolated, then carried by the part.
function paintAt(pn, tr, t, P) {
  if (pn.k === 's') return { type: 'solid', c: color(pn.a, pn.b, t) };
  const stops = pn.sa.map((s, i) => ({
    c: color(s.c, pn.sb[i].c, t), o: lerp(s.o, pn.sb[i].o, t), off: lerp(s.off, pn.sb[i].off, t)
  }));
  if (pn.k === 'l') {
    const p = [];
    if (pn.att) {
      // endpoints attached to the stroke: vertex in pose 1 / pose 2 + offset, blended
      pn.att.forEach(([i1, i2, ox1, oy1, ox2, oy2]) => {
        const x1 = P[2 * i1] + ox1, y1 = P[2 * i1 + 1] + oy1, x2 = P[2 * i2] + ox2, y2 = P[2 * i2 + 1] + oy2;
        p.push(lerp(x1, x2, t), lerp(y1, y2, t));
      });
    } else for (let i = 0; i < 4; i += 2) p.push(...tr.M(lerp(pn.a[i], pn.b[i], t), lerp(pn.a[i + 1], pn.b[i + 1], t)));
    return { type: 'lin', p, stops };
  }
  // radial: rotate the two axis vectors with the part, carry the centre as a point
  const L = pn.a.map((v, i) => lerp(v, pn.b[i], t));
  const c = Math.cos(tr.ang), s = Math.sin(tr.ang);
  const [ox, oy] = tr.M(L[4], L[5]);
  return { type: 'rad', m: [c * L[0] - s * L[1], s * L[0] + c * L[1], c * L[2] - s * L[3], s * L[2] + c * L[3], ox, oy], stops };
}

// Returns a list of per-element render states for progress g in [0,1]
function frame(rig, g) {
  const T = solve(rig, g), out = [];
  rig.DATA.parts.forEach(p => {
    const tr = T[p.name], first = out.length;
    p.els.forEach(el => {
      const t = tr.t, P = [], o = { part: p.name, layer: el.over ? 'bodyOver' : p.name, d: pathD(el, tr, T.body, P) };
      o.opacity = (el.grow ? smooth((t - 0.35) / 0.55) : 1) * lerp(el.op[0], el.op[1], t);
      o.fo = lerp(el.fo[0], el.fo[1], t);
      if (el.fill) o.fill = paintAt(el.fill, tr, t, P);
      if (el.stroke) { o.stroke = paintAt(el.stroke, tr, t, P); o.sw = el.sw; }
      if (el.eye) { o.eye = el.eye; o.eyeBase = !!el.eyeBase; }
      if (el.clip !== undefined) o.clipOf = first + el.clip;
      o.P = P;
      out.push(o);
    });
  });
  out.forEach(o => { if (o.clipOf !== undefined) { o.clipD = out[o.clipOf].d; delete o.clipOf; } });
  // render order: the head shadow goes right after the front legs
  const over = out.filter(e => e.layer === 'bodyOver');
  const rest = out.filter(e => e.layer !== 'bodyOver');
  rest.splice(rest.map(e => e.part).lastIndexOf('frontR') + 1, 0, ...over);
  out.forEach(e => { if (e.layer !== 'bodyOver') delete e.P; });
  return { els: rest, T };
}

export const PoseMorph = { makeRig, frame, solve, smooth, TIMING, ANCHOR_LINEAR };
