/**
 * Bone — motion of its own (on top of the head-following placement in the mouth).
 *
 *   1. Breathing   the bone grows very slightly and evenly (no change of shape) in time with the
 *                  dog's breathing (same phase, same 3-second period).
 *   2. Rocking     when the dog changes pose (crouch, play pose, getting back up) the bone tilts a
 *                  little in the mouth: it turns around the middle of the shaft, where the mouth holds
 *                  it — a short spring driven by the head's acceleration — with a few smooth dying-out
 *                  swings, and comes back to rest. The held point stays in the mouth, so the bone
 *                  never drops out or shifts away.
 *
 * The whole bone is moved as one piece (one group transform); the placement in the mouth is not
 * touched. The sequence is precomputed from time, so seek, pause and any frame always look the same.
 * With every amount set to 0 the bone is drawn exactly as designed.
 */
import { buildInertia } from '../../core/inertia.js';

export const BONE_MOTION = {
  // Geometry of the bone (its own SVG coordinates, 104 × 35)
  centre: [52, 17.5],        // middle of the bone (breathing)
  grip: [52, 12],            // where the mouth holds it (top of the shaft): the rocking turns around it
  // 1. Breathing: growth at the dog's breathing peak (share of the size)
  breath: 0.02,
  // 2. Rocking: a soft spring (1.8 swings per second, settles in about 1.5 seconds), driven by the
  //    head's acceleration (softened over the past `smoothing` seconds, so it never leads the head):
  //    about 4° when the dog crouches and gets back up; maxDeg is a soft ceiling
  rock: { omega: 2 * Math.PI * 1.8, zeta: 0.22, gain: 0.055, maxDeg: 7, smoothing: 0.16 }
};

const NS = 'http://www.w3.org/2000/svg';
const RAD = Math.PI / 180, TAU = Math.PI * 2;
const softLimit = (v, lim) => lim * Math.tanh(v / lim);

export function createBoneMotion(cfg = BONE_MOTION) {
  return ({ elements, placementAt, duration, cfg: dog }) => {
    const shapes = elements.filter(e => e.tagName.toLowerCase() !== 'defs');
    if (!shapes.length) return { apply() {} };
    // One group around the bone's own shapes: the motion is a single transform on it
    const doc = shapes[0].ownerDocument;
    const g = doc.createElementNS(NS, 'g');
    g.setAttribute('data-accessory-motion', '');
    shapes[0].parentNode.insertBefore(g, shapes[0]);
    shapes.forEach(el => g.appendChild(el));

    const [cx, cy] = cfg.centre, [gx, gy] = cfg.grip, r = cfg.rock;
    const lag = buildInertia({
      placementAt, duration, periodic: true, smoothing: r.smoothing,
      anchor: cfg.centre,
      translation: { omega: r.omega, zeta: r.zeta },
      springs: { rock: { omega: r.omega, zeta: r.zeta, axis: [cx - gx, cy - gy], length: Math.hypot(cx - gx, cy - gy) } }
    });

    function apply(info) {
      const time = info.time;
      if (!Number.isFinite(time)) return;
      const p = (((time % dog.LOOP) + dog.LOOP) % dog.LOOP) / dog.LOOP;
      const k = (1 - Math.cos(TAU * p * dog.breath.cycles)) / 2;     // dog's breathing curve
      const s = 1 + cfg.breath * k;
      const deg = softLimit(r.gain * lag(time).rock, r.maxDeg * RAD) / RAD;
      g.setAttribute('transform',
        `rotate(${deg.toFixed(3)} ${gx} ${gy}) translate(${cx} ${cy}) scale(${s.toFixed(5)}) translate(${-cx} ${-cy})`);
    }

    return { apply };
  };
}
