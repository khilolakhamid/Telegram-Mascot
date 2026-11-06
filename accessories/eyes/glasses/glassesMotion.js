/**
 * Glasses — motion of their own (on top of the head-following placement on the eyes).
 *
 *   1. Lens glint   now and then a quick streak of light sweeps across the glass — "whoosh": it fades
 *                   in, slides over the lens while it widens a little, and fades out; first over the
 *                   left lens, a moment later over the right one, then a pause. The streak (two parallel
 *                   stripes, STREAK below) is drawn in a light tint and clipped to the lens shape, so it
 *                   never goes past the glass. The lens highlights, frames and lenses of the SVG stay as
 *                   designed. Once in every 3-second block, at the same moment, so blocks join seamlessly.
 *   2. Rocking      when the dog changes pose (crouch, play pose, getting back up) the glasses tilt a
 *                   little around the bridge on the nose — a short spring driven by the head's
 *                   acceleration — with a few smooth dying-out swings, and settle back in place.
 *
 * The placement on the eyes is not touched. The sequence is precomputed from time, so seek, pause
 * and any frame always look the same. With every amount set to 0 the glasses are drawn exactly as
 * designed.
 */
import { buildInertia } from '../../core/inertia.js';

export const GLASSES_MOTION = {
  // Geometry of the glasses (their own SVG coordinates, 111 × 63)
  bridge: [52.6, 26.5],      // middle of the bridge on the nose: the rocking turns around it
  // 1. Lens glint
  glint: {
    at: 1.4,                 // s into every 3-second block when the sweep starts (left lens)
    duration: 0.5,           // s for the light to cross one lens
    delay: 0.09,             // s the right lens follows the left one
    travel: 26,              // the streak moves from −travel to +travel across the stripes
    widen: [0.55, 1.25],     // streak width at the start/end and in the middle
    opacity: 0.55,           // at its brightest (the streak's own colour below)
    colour: '#F6FFE0'
  },
  // 2. Rocking: a soft spring (2.6 swings per second, settles in about a second), driven by the
  //    head's acceleration (softened over the past `smoothing` seconds, so it never leads the head):
  //    about 4° when the dog crouches and gets back up; maxDeg is a soft ceiling
  rock: { omega: 2 * Math.PI * 2.6, zeta: 0.2, gain: 0.22, maxDeg: 6, smoothing: 0.16 }
};

// Elements by order in glasses.svg (the file itself is not changed)
const SHAPES = 15;                                            // top-level shapes in this drawing
const LENS = { left: 3, right: 7 };                           // dark lens fills: the glint's clip shapes
const GLINT_BEFORE = { left: 5, right: 9 };                   // each glint goes right above its lens and its
                                                              // highlight, under the bridge and frame strokes
// The glint streak: two parallel stripes per lens (the approved streak shape, in glasses coordinates)
const STREAK = {
  right: ['M89.0306 17.2096L67.8646 45.6671L64.9145 38.0299L83.4741 13.0768L89.0306 17.2096Z', 'M70.1377 47.3578L91.3038 18.9003L94.082 20.9667L72.916 49.4242L70.1377 47.3578Z'],
  left: ['M34.135 20.0922L13.8269 47.3962L10.9964 40.0686L28.8037 16.1269L34.135 20.0922Z', 'M16.0079 49.0183L36.316 21.7144L38.9816 23.697L18.6735 51.001L16.0079 49.0183Z']
};

const NS = 'http://www.w3.org/2000/svg';
const RAD = Math.PI / 180;
let uid = 0;
const softLimit = (v, lim) => lim * Math.tanh(v / lim);
const easeInOut = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

export function createGlassesMotion(cfg = GLASSES_MOTION) {
  return ({ elements, placementAt, duration, cfg: dog }) => {
    const shapes = elements.filter(e => e.tagName.toLowerCase() !== 'defs');
    if (shapes.length !== SHAPES) return { apply() {} };   // a different glasses drawing: no motion
    const doc = shapes[0].ownerDocument, parent = shapes[0].parentNode, id = `glasses-glint-${++uid}`;

    // Everything in one group: the rocking is one transform on it
    const g = doc.createElementNS(NS, 'g');
    g.setAttribute('data-accessory-motion', '');
    parent.insertBefore(g, shapes[0]);
    shapes.forEach(el => g.appendChild(el));

    // Glint streaks: copies of the stripes, light tint, clipped to their lens, under the frames
    const defs = doc.createElementNS(NS, 'defs');
    g.insertBefore(defs, shapes[0]);
    const glints = ['left', 'right'].map((side, i) => {
      const clip = doc.createElementNS(NS, 'clipPath');
      clip.id = `${id}-${side}`;
      const cp = doc.createElementNS(NS, 'path');
      cp.setAttribute('d', shapes[LENS[side]].getAttribute('d'));
      clip.appendChild(cp); defs.appendChild(clip);
      const holder = doc.createElementNS(NS, 'g');
      holder.setAttribute('clip-path', `url(#${clip.id})`);
      holder.setAttribute('data-glint', side);
      const band = doc.createElementNS(NS, 'g');
      band.setAttribute('fill', cfg.glint.colour);
      band.setAttribute('opacity', '0');
      const pts = [];
      STREAK[side].forEach(d => {
        const p = doc.createElementNS(NS, 'path');
        p.setAttribute('d', d);
        band.appendChild(p);
        (d.match(/-?\d+\.?\d*/g) || []).map(Number).forEach((v, j, a) => { if (j % 2 === 0 && j + 1 < a.length) pts.push([v, a[j + 1]]); });
      });
      holder.appendChild(band);
      g.insertBefore(holder, shapes[GLINT_BEFORE[side]]);
      // stripe direction (long side) and the direction across the stripes
      const sp = STREAK[side][0].match(/-?\d+\.?\d*/g).map(Number);
      let ux = sp[2] - sp[0], uy = sp[3] - sp[1];
      const L = Math.hypot(ux, uy); ux /= L; uy /= L;
      let px = -uy, py = ux;
      if (px < 0) { px = -px; py = -py; }   // sweep from left to right
      const c = pts.reduce((a, q) => [a[0] + q[0] / pts.length, a[1] + q[1] / pts.length], [0, 0]);
      return { band, delay: i * cfg.glint.delay, p: [px, py], c };
    });

    const [bx, by] = cfg.bridge, r = cfg.rock;
    const lag = buildInertia({
      placementAt, duration, periodic: true, smoothing: r.smoothing,
      anchor: cfg.bridge,
      translation: { omega: r.omega, zeta: r.zeta },
      springs: { rock: { omega: r.omega, zeta: r.zeta, axis: [0, 1], length: 14 } }
    });

    function apply(info) {
      const time = info.time;
      if (!Number.isFinite(time)) return;
      const deg = softLimit(r.gain * lag(time).rock, r.maxDeg * RAD) / RAD;
      g.setAttribute('transform', `rotate(${deg.toFixed(3)} ${bx} ${by})`);

      const local = ((time % dog.LOOP) + dog.LOOP) % dog.LOOP, gl = cfg.glint;
      for (const s of glints) {
        const u = (local - gl.at - s.delay) / gl.duration;
        if (u <= 0 || u >= 1) { s.band.setAttribute('opacity', '0'); continue; }
        const d = gl.travel * (2 * easeInOut(u) - 1);
        const w = gl.widen[0] + (gl.widen[1] - gl.widen[0]) * Math.sin(Math.PI * u);
        const o = gl.opacity * Math.pow(Math.sin(Math.PI * u), 1.5);
        // translate across the stripes, and scale their width (across) around the streak's centre
        const [px, py] = s.p, [cx, cy] = s.c;
        const a = 1 + (w - 1) * px * px, b = (w - 1) * px * py, dd = 1 + (w - 1) * py * py;
        const e = cx - a * cx - b * cy + px * d, f = cy - b * cx - dd * cy + py * d;
        s.band.setAttribute('transform', `matrix(${[a, b, b, dd, e, f].map(v => +v.toFixed(5)).join(' ')})`);
        s.band.setAttribute('opacity', o.toFixed(3));
      }
    }

    return { apply };
  };
}
