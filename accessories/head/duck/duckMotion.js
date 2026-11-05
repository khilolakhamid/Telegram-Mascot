/**
 * Duck — motion of its own (on top of the head-following placement).
 *
 *   1. Breathing   the duck grows very slightly and evenly in time with the dog's breathing (same
 *                  phase, same 3-second period), from the point where it sits, so it stays seated.
 *   2. Balancing   a gentle, slow rocking from side to side around the seat point, as if the duck
 *                  keeps its balance on the head.
 *   3. Rocking     when the dog changes pose (crouch, play pose, getting back up) the duck tips over
 *                  noticeably by inertia — a short upright pendulum on the head, driven by the head's
 *                  acceleration — makes a few dying-out swings and comes back upright.
 *
 * Every motion turns or scales around the seat point (the bottom of the duck on the head), so the
 * duck never lifts off or slides. Its soft shadow (the blurred ellipse in the SVG) stays on the head.
 * The whole duck moves as one piece (one group transform); the placement on the head is not touched.
 * The sequence is precomputed from time, so seek, pause and any frame always look the same.
 * With every amount set to 0 the duck is drawn exactly as designed.
 */
import { buildInertia } from '../../core/inertia.js';

export const DUCK_MOTION = {
  // Geometry of the duck (its own SVG coordinates, 57 × 62)
  seat: [28.5, 50.5],        // bottom of the duck, where it sits on the head: everything turns around it
  centre: [28.5, 27],        // middle of the duck's body (for the pendulum length)
  // 1. Breathing: growth at the dog's breathing peak (share of the size)
  breath: 0.02,
  // 2. Balancing: degrees; one slow swing per 3-second block (blocks join seamlessly)
  balance: { amp: 3, cycles: 1, phase: 0.45 },
  // 3. Rocking: a springy pendulum (3 swings per second, settles in about a second), driven by the
  //    head's acceleration (softened over the past `smoothing` seconds, so it never leads the head):
  //    about 10° when the dog crouches and gets back up, only a little during the calm head turns;
  //    maxDeg is a soft ceiling
  rock: { omega: 2 * Math.PI * 3.0, zeta: 0.18, gain: 2, maxDeg: 14, smoothing: 0.16 }
};

const NS = 'http://www.w3.org/2000/svg';
const RAD = Math.PI / 180, TAU = Math.PI * 2;
const softLimit = (v, lim) => lim * Math.tanh(v / lim);

export function createDuckMotion(cfg = DUCK_MOTION) {
  return ({ elements, placementAt, duration, cfg: dog }) => {
    // The first element is the blurred shadow: it stays on the head. The rest is the duck.
    const body = elements.filter((el, i) => i > 0 && el.tagName.toLowerCase() !== 'defs');
    if (!body.length) return { apply() {} };
    const doc = body[0].ownerDocument;
    const g = doc.createElementNS(NS, 'g');
    g.setAttribute('data-accessory-motion', '');
    body[0].parentNode.insertBefore(g, body[0]);
    body.forEach(el => g.appendChild(el));

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
      const b = cfg.balance, ph = TAU * (p * b.cycles + b.phase);
      const balance = b.amp * (0.85 * Math.sin(ph) + 0.15 * Math.sin(2 * ph - 0.6));
      const deg = balance + softLimit(r.gain * lag(time).rock, r.maxDeg * RAD) / RAD;
      g.setAttribute('transform', `rotate(${deg.toFixed(3)} ${sx} ${sy}) translate(${sx} ${sy}) scale(${s.toFixed(5)}) translate(${-sx} ${-sy})`);
    }

    return { apply };
  };
}
