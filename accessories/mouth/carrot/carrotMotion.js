/**
 * Carrot — motion of its own (on top of the head-following placement in the mouth).
 *
 *   1. Leaf sway     the green top bends slowly up and down around its base, like soft leaves; the
 *                    bend grows from the base (where it sits on the root) to the leaf tips, so the
 *                    base stays attached to the carrot.
 *   2. Breathing     the root swells very slightly across and along, in time with the dog's breathing
 *                    (same phase, same 3-second period). Its face (eyes, smile) rides along.
 *   3. Shake         when the dog changes pose (crouch, play pose, getting back up) the leaves get a
 *                    quick, sharp throw from the head's acceleration, then several dying-out swings
 *                    (a light, fast damped spring), and go back to the slow sway.
 *
 * Everything reshapes the carrot's own paths in its own coordinates; the carrot's placement in the
 * mouth is not touched. The whole sequence is precomputed from time, so seek, pause and any frame
 * always look the same. With every amount set to 0 the carrot is drawn exactly as designed.
 */
import { parsePath, buildPath } from '../../core/pathDeform.js';
import { buildInertia } from '../../core/inertia.js';

export const CARROT_MOTION = {
  // Geometry of the carrot (its own SVG coordinates, 102 × 36)
  leafBase: [33, 18],        // where the leaves sit on the root: the bend turns around this point
  leafLength: 27,            // base → leaf tips (the tips are at x ≈ 6)
  rootCentre: [59.5, 18],    // centre of the root, for breathing
  // 1. Leaf sway: degrees at the leaf tips; one slow swing per 3-second block (blocks join seamlessly)
  sway: { amp: 5, cycles: 1, phase: 0.62 },
  // 2. Breathing: root growth across (share of its thickness) and along (share of its length)
  breath: { across: 0.03, along: 0.01 },
  // 3. Shake: a light, fast spring on the leaves (3.4 swings per second, dies out in about a second),
  //    driven by the head's acceleration (softened over the past `smoothing` seconds, so it never
  //    leads the head); ≈18° at the tips when the dog crouches, ≈14° when it gets back up; maxDeg is a soft ceiling
  shake: { omega: 2 * Math.PI * 3.4, zeta: 0.14, gain: 1.35, maxDeg: 24, smoothing: 0.16 }
};

// Element roles by order in carrot.svg (the file itself is not changed)
const LEAF = 'leaf', ROOT = 'root';
const ROLES = [LEAF, LEAF, ROOT, ROOT, LEAF, LEAF, LEAF, LEAF, LEAF, LEAF, LEAF,
  ROOT, ROOT, ROOT, ROOT, ROOT, ROOT, ROOT, ROOT];

const RAD = Math.PI / 180, TAU = Math.PI * 2;
const smooth01 = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
const softLimit = (v, lim) => lim * Math.tanh(v / lim);

export function createCarrotMotion(cfg = CARROT_MOTION) {
  return ({ elements, placementAt, duration, cfg: dog }) => {
    const shapes = elements.filter(e => e.tagName.toLowerCase() !== 'defs');
    if (shapes.length !== ROLES.length) return { apply() {} };   // a different carrot drawing: no motion

    const [bx, by] = cfg.leafBase, [rx, ry] = cfg.rootCentre;
    const items = shapes.map((el, i) => {
      const tag = el.tagName.toLowerCase();
      return tag === 'path'
        ? { el, role: ROLES[i], parsed: parsePath(el.getAttribute('d')) }
        : { el, role: ROLES[i], circle: [+el.getAttribute('cx'), +el.getAttribute('cy')] };
    });

    // Shake: the leaves point from the base towards −x
    const lag = buildInertia({
      placementAt, duration, periodic: true, smoothing: cfg.shake.smoothing,
      anchor: cfg.rootCentre,
      translation: { omega: cfg.shake.omega, zeta: cfg.shake.zeta },
      springs: { leaves: { omega: cfg.shake.omega, zeta: cfg.shake.zeta, axis: [-1, 0], length: cfg.leafLength } }
    });

    let leafAngle = 0, across = 0, along = 0;
    const leafMap = (x, y) => {
      const w = smooth01((bx - x) / cfg.leafLength);   // 0 at the base … 1 at the tips
      if (!w) return [x, y];
      const a = leafAngle * w, c = Math.cos(a), s = Math.sin(a), dx = x - bx, dy = y - by;
      return [bx + c * dx - s * dy, by + s * dx + c * dy];
    };
    const rootMap = (x, y) => [rx + (x - rx) * (1 + along), ry + (y - ry) * (1 + across)];
    const both = (x, y) => { const [a, b] = leafMap(x, y); return rootMap(a, b); };

    function apply(info) {
      const time = info.time;
      if (!Number.isFinite(time)) return;
      const p = (((time % dog.LOOP) + dog.LOOP) % dog.LOOP) / dog.LOOP;

      const k = (1 - Math.cos(TAU * p * dog.breath.cycles)) / 2;            // dog's breathing curve
      across = cfg.breath.across * k;
      along = cfg.breath.along * k;

      const sw = cfg.sway, ph = TAU * (p * sw.cycles + sw.phase);
      const sway = sw.amp * (0.86 * Math.sin(ph) + 0.14 * Math.sin(2 * ph - 0.7));
      const shake = softLimit(cfg.shake.gain * lag(time).leaves, cfg.shake.maxDeg * RAD);
      leafAngle = sway * RAD + shake;

      for (const it of items) {
        const map = it.role === LEAF ? both : rootMap;
        if (it.parsed) it.el.setAttribute('d', buildPath(it.parsed, map));
        else {
          const [x, y] = map(it.circle[0], it.circle[1]);
          it.el.setAttribute('cx', x.toFixed(3)); it.el.setAttribute('cy', y.toFixed(3));
        }
      }
    }

    return { apply };
  };
}
