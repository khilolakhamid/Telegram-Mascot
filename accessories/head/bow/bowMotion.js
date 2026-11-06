/**
 * Bow — motion of its own (on top of the head-following placement).
 *
 *   1. Soft sway    the two loops flap gently up and down around the knot, like soft fabric: a slow
 *                   swing with a little springy overtone; the right loop runs slightly ahead of the
 *                   left one. The bend grows from the knot outwards, so the knot stays fixed on the head.
 *   2. Shake        when the dog changes pose (crouch, play pose, getting back up) both loops get a
 *                   quick, sharp throw from the head's acceleration, then several dying-out swings
 *                   (the same kind of light damped spring as the carrot's leaves), and go back to the
 *                   slow sway.
 *
 * Everything reshapes the bow's own paths in its own coordinates; the placement on the head is not
 * touched. The whole sequence is precomputed from time, so seek, pause and any frame always look the
 * same, and it loops endlessly. With every amount set to 0 the bow is drawn exactly as designed.
 */
import { parsePath, buildPath } from '../../core/pathDeform.js';
import { buildInertia } from '../../core/inertia.js';

export const BOW_MOTION = {
  // Geometry of the bow (its own SVG coordinates, 82 × 48)
  knot: [40.85, 24.1],      // centre of the knot: both loops turn around it
  hold: 6,                  // within this distance of the knot centre the loops don't move (under the knot)
  loopLength: 32,           // knot → outer edge of a loop
  // 1. Soft sway: degrees at the loop edges; one slow swing per 3-second block (blocks join seamlessly)
  sway: { amp: 4, cycles: 1, phase: 0.3, lead: 0.06, overtone: 0.18 },
  // 2. Shake: light, fast springs on the loops (3 swings per second, dies out in about a second),
  //    driven by the head's acceleration (softened over the past `smoothing` seconds, so it never
  //    leads the head); ≈15° at the loop edges when the dog crouches and gets back up; maxDeg is a soft ceiling
  shake: { omega: 2 * Math.PI * 3.0, zeta: 0.16, gain: 1.2, maxDeg: 20, smoothing: 0.16 }
};

// Element roles by order in bow.svg (the file itself is not changed): right loop, left loop, knot
const R = 'right', L = 'left', K = 'knot';
const ROLES = [R, R, R, R, R, R, L, L, L, L, L, L, K, K, K, K];

const RAD = Math.PI / 180, TAU = Math.PI * 2;
const smooth01 = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
const softLimit = (v, lim) => lim * Math.tanh(v / lim);

export function createBowMotion(cfg = BOW_MOTION) {
  return ({ elements, placementAt, duration, cfg: dog }) => {
    const shapes = elements.filter(e => e.tagName.toLowerCase() !== 'defs');
    if (shapes.length !== ROLES.length) return { apply() {} };   // a different bow drawing: no motion

    const [kx, ky] = cfg.knot;
    const items = shapes.map((el, i) => ({ el, role: ROLES[i], parsed: ROLES[i] === K ? null : parsePath(el.getAttribute('d')) }));

    // Shake: the right loop points from the knot towards +x, the left one towards −x
    const sp = { omega: cfg.shake.omega, zeta: cfg.shake.zeta };
    const lag = buildInertia({
      placementAt, duration, periodic: true, smoothing: cfg.shake.smoothing,
      anchor: cfg.knot,
      translation: sp,
      springs: {
        right: { ...sp, axis: [1, 0], length: cfg.loopLength },
        left: { ...sp, axis: [-1, 0], length: cfg.loopLength }
      }
    });

    // Rotate a loop around the knot; the turn grows from 0 (at the knot) to full (at the loop edge)
    const loopMap = angle => (x, y) => {
      const w = smooth01((Math.abs(x - kx) - cfg.hold) / (cfg.loopLength - cfg.hold));
      if (!w) return [x, y];
      const a = angle * w, c = Math.cos(a), s = Math.sin(a), dx = x - kx, dy = y - ky;
      return [kx + c * dx - s * dy, ky + s * dx + c * dy];
    };

    function apply(info) {
      const time = info.time;
      if (!Number.isFinite(time)) return;
      const p = (((time % dog.LOOP) + dog.LOOP) % dog.LOOP) / dog.LOOP;
      const sw = cfg.sway;
      const wave = ph => sw.amp * ((1 - sw.overtone) * Math.sin(ph) + sw.overtone * Math.sin(2 * ph - 0.7));
      const base = TAU * (p * sw.cycles + sw.phase);
      const g = lag(time), lim = cfg.shake.maxDeg * RAD;
      // right loop: + turns its edge down; left loop: − turns its edge down (mirror)
      const right = wave(base + TAU * sw.lead) * RAD + softLimit(cfg.shake.gain * g.right, lim);
      const left = -wave(base) * RAD + softLimit(cfg.shake.gain * g.left, lim);
      const maps = { [R]: loopMap(right), [L]: loopMap(left) };
      for (const it of items) if (it.parsed) it.el.setAttribute('d', buildPath(it.parsed, maps[it.role]));
    }

    return { apply };
  };
}
