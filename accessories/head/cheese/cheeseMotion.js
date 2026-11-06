/**
 * Cheese — motion of its own (on top of the head-following placement).
 *
 *   1. Breathing   the cheese grows very slightly and evenly in time with the dog's breathing (same
 *                  phase, same 3-second period), from the point where it lies, so it stays in place.
 *   2. Rocking     when the dog changes pose (crouch, play pose, getting back up) the cheese tips a
 *                  little by inertia — a short upright pendulum on the head, driven by the head's
 *                  acceleration — with a few smooth dying-out swings, and settles back.
 *
 * Both motions turn or scale around the seat point (the middle of the bottom edge, on the head), so
 * the cheese never lifts off or slides. The whole cheese moves as one piece (one group transform);
 * the placement on the head is not touched. The sequence is precomputed from time, so seek, pause
 * and any frame always look the same. With every amount set to 0 the cheese is drawn exactly as
 * designed.
 */
import { buildInertia } from '../../core/inertia.js';

export const CHEESE_MOTION = {
  // Geometry of the cheese (its own SVG coordinates, 82 × 43)
  seat: [42, 35],            // middle of the bottom edge, where it lies on the head: everything turns around it
  centre: [40, 20],          // middle of the cheese (for the pendulum length)
  // 1. Breathing: growth at the dog's breathing peak (share of the size)
  breath: 0.02,
  // 2. Rocking: a springy pendulum (3 swings per second, settles in about a second), driven by the
  //    head's acceleration (softened over the past `smoothing` seconds, so it never leads the head):
  //    about 4–5° when the dog crouches and gets back up; maxDeg is a soft ceiling
  rock: { omega: 2 * Math.PI * 3.0, zeta: 0.18, gain: 0.45, maxDeg: 8, smoothing: 0.16 }
};

const NS = 'http://www.w3.org/2000/svg';
const RAD = Math.PI / 180, TAU = Math.PI * 2;
const softLimit = (v, lim) => lim * Math.tanh(v / lim);

export function createCheeseMotion(cfg = CHEESE_MOTION) {
  return ({ elements, placementAt, duration, cfg: dog }) => {
    const shapes = elements.filter(e => e.tagName.toLowerCase() !== 'defs');
    if (!shapes.length) return { apply() {} };
    // One group around the cheese's own shapes: the motion is a single transform on it
    const doc = shapes[0].ownerDocument;
    const g = doc.createElementNS(NS, 'g');
    g.setAttribute('data-accessory-motion', '');
    shapes[0].parentNode.insertBefore(g, shapes[0]);
    shapes.forEach(el => g.appendChild(el));

    const [sx, sy] = cfg.seat, [cx, cy] = cfg.centre, r = cfg.rock;
    const lag = buildInertia({
      placementAt, duration, periodic: true, smoothing: r.smoothing,
      anchor: cfg.seat,
      translation: { omega: r.omega, zeta: r.zeta },
      // an upright pendulum: the body points up from the seat
      springs: { rock: { omega: r.omega, zeta: r.zeta, axis: [cx - sx, cy - sy], length: Math.hypot(cx - sx, cy - sy) } }
    });

    function apply(info) {
      const time = info.time;
      if (!Number.isFinite(time)) return;
      const p = (((time % dog.LOOP) + dog.LOOP) % dog.LOOP) / dog.LOOP;
      const k = (1 - Math.cos(TAU * p * dog.breath.cycles)) / 2;       // dog's breathing curve
      const s = 1 + cfg.breath * k;
      const deg = softLimit(r.gain * lag(time).rock, r.maxDeg * RAD) / RAD;
      g.setAttribute('transform', `rotate(${deg.toFixed(3)} ${sx} ${sy}) translate(${sx} ${sy}) scale(${s.toFixed(5)}) translate(${-sx} ${-sy})`);
    }

    return { apply };
  };
}
