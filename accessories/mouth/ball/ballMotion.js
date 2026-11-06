/**
 * Ball — motion of its own (on top of the head-following placement in the mouth).
 *
 *   1. Breathing   the ball grows very slightly and evenly (no change of shape) in time with the
 *                  dog's breathing (same phase, same 3-second period).
 *   2. Wobble      when the dog changes pose (crouch, play pose, getting back up) the ball rocks a
 *                  little in the mouth: it turns around the point where the mouth holds it, like a
 *                  short pendulum driven by the head's acceleration, with a few smooth dying-out
 *                  swings, and comes back to rest. The held point stays in the mouth, so the ball
 *                  never drops out or shifts away.
 *
 * The whole ball is moved as one piece (one group transform); the placement in the mouth is not
 * touched. The sequence is precomputed from time, so seek, pause and any frame always look the same.
 * With every amount set to 0 the ball is drawn exactly as designed.
 */
import { buildInertia } from '../../core/inertia.js';

export const BALL_MOTION = {
  // Geometry of the ball (its own SVG coordinates, 61 × 61)
  centre: [30.32, 30.32],
  grip: [30.32, 8],          // where the mouth holds the ball (top of the ball): the wobble turns around it
  // 1. Breathing: growth at the dog's breathing peak (share of the size)
  breath: 0.02,
  // 2. Wobble: a soft spring (1.8 swings per second, settles in about 1.5 seconds), driven by the
  //    head's acceleration (softened over the past `smoothing` seconds, so it never leads the head),
  //    up to about 4–5° when the dog crouches and gets back up; maxDeg is a soft ceiling
  wobble: { omega: 2 * Math.PI * 1.8, zeta: 0.22, gain: 0.22, maxDeg: 7, smoothing: 0.16 }
};

const NS = 'http://www.w3.org/2000/svg';
const RAD = Math.PI / 180, TAU = Math.PI * 2;
const softLimit = (v, lim) => lim * Math.tanh(v / lim);

export function createBallMotion(cfg = BALL_MOTION) {
  return ({ elements, placementAt, duration, cfg: dog }) => {
    if (!elements.length) return { apply() {} };
    // One group around the ball's own shapes: the motion is a single transform on it
    const doc = elements[0].ownerDocument, parent = elements[0].parentNode;
    const g = doc.createElementNS(NS, 'g');
    g.setAttribute('data-accessory-motion', '');
    parent.insertBefore(g, elements[0]);
    elements.forEach(el => g.appendChild(el));

    const [cx, cy] = cfg.centre, [gx, gy] = cfg.grip;
    const w = cfg.wobble;
    const lag = buildInertia({
      placementAt, duration, periodic: true, smoothing: w.smoothing,
      anchor: cfg.centre,
      translation: { omega: w.omega, zeta: w.zeta },
      springs: { swing: { omega: w.omega, zeta: w.zeta, axis: [cx - gx, cy - gy], length: Math.hypot(cx - gx, cy - gy) } }
    });

    function apply(info) {
      const time = info.time;
      if (!Number.isFinite(time)) return;
      const p = (((time % dog.LOOP) + dog.LOOP) % dog.LOOP) / dog.LOOP;
      const k = (1 - Math.cos(TAU * p * dog.breath.cycles)) / 2;     // dog's breathing curve
      const s = 1 + cfg.breath * k;
      const deg = softLimit(w.gain * lag(time).swing, w.maxDeg * RAD) / RAD;
      g.setAttribute('transform',
        `rotate(${deg.toFixed(3)} ${gx} ${gy}) translate(${cx} ${cy}) scale(${s.toFixed(5)}) translate(${-cx} ${-cy})`);
    }

    return { apply };
  };
}
