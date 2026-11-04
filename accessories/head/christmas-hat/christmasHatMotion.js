/**
 * Christmas hat — secondary motion of the fabric (on top of the head-following placement).
 *
 *   1. Tip sway      the hanging tip bends slowly left–right like soft cloth; the bend grows from
 *                    the fold toward the pompom, so the base stays put. The pompom rides on the tip.
 *   2. Breathing     the crown swells very slightly in time with the dog's breathing (same phase,
 *                    same 3-second period); the fur band stays exactly on the head.
 *   3. Pose bounce   when the dog crouches and comes back, the crown lags, hops a little and settles,
 *                    and the tip swings after it (damped springs driven by the head's acceleration).
 *   4. Landing hop   once the dog is back in pose 1, the hat gives one more small hop and settles
 *                    (start of the block that follows the play block).
 *
 * Everything reshapes the hat's own paths; the fur band (the part that sits on the head) never moves,
 * so the hat cannot slide off or lift away from the head. All values are in hat units (1 = 1 px of
 * the 240 × 240 dog at full size). With every amount set to 0 the hat is drawn exactly as designed.
 */
import { parsePath, buildPath } from '../../core/pathDeform.js';
import { buildInertia } from '../../core/inertia.js';
import { locate } from '../../../mascot/animations/dogAnimation.js';

export const CHRISTMAS_HAT_MOTION = {
  // Geometry of the hat (its own SVG coordinates)
  band: [[19.88, 24.41], [83.38, 65.14]],   // lower edge of the crown, along the top of the fur band
  crownHeight: 40,                          // band → top of the crown
  hinge: [93.5, 15.5],                      // where the tip folds over
  tipEnd: [114.3, 79.8],                    // pompom centre at rest

  // 1. Tip sway: degrees at the pompom; one slow swing per 3-second block (blocks join seamlessly)
  sway: { amp: 4.5, cycles: 1, phase: 0.15, playBoost: 0.3 },
  // 2. Breathing: crown stretch (share of its height) and widening, at the dog's breathing peak
  breath: { stretch: 0.03, widen: 0.012, pompom: 0.02 },
  // 3. Pose bounce (inertia): spring stiffness (rad/s) and damping; limits keep it delicate
  inertia: {
    crown: { omega: 2 * Math.PI * 2.4, zeta: 0.42 },
    tip: { omega: 2 * Math.PI * 1.8, zeta: 0.34 },
    settle: 0.35,         // s: leftover sway eases out before each 3-second block ends
    hop: 0.9,             // crown stretch per unit of lag (share of height per crown height)
    maxHop: 0.07,         // at most 7 % of the crown height (≈ 2.8 px)
    crownTilt: 1.0, maxCrownTiltDeg: 3.5,
    tipSwing: 1.0, maxTipSwingDeg: 9
  },
  // 4. Landing hop after the dog is back in pose 1: one hop up, a light squash, rest.
  //    hop: peak crown stretch (share of its height); tipDeg: swing of the tip that follows it.
  landing: { dur: 0.6, hop: 0.085, tipDeg: 5 }
};

// Path roles, by order in christmas-hat.svg (the file itself is not changed)
const CROWN = 'crown', TIP = 'tip', BAND = 'band', POMPOM = 'pompom';
const ROLES = [CROWN, CROWN, TIP, TIP, CROWN, CROWN, BAND, BAND, BAND, TIP, POMPOM, POMPOM, POMPOM, CROWN];
// Parts of crown paths that are tucked under the tip follow the tip (keeps edges together)
const UNDER_TIP = { 0: (x, y) => x > 88 && y > 25, 5: (x, y) => x > 84 && y > 30 };

const RAD = Math.PI / 180, TAU = Math.PI * 2;
const smooth01 = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
const softLimit = (v, lim) => lim * Math.tanh(v / lim);
// Landing curve over v = 0…1: starts and ends at rest with zero speed; up (≈ +1 at v ≈ 0.2),
// a small squash (≈ −0.23 at v ≈ 0.7), rest.
const landingCurve = v => (v <= 0 || v >= 1) ? 0
  : smooth01(v / 0.12) * Math.sin(TAU * v) * Math.pow(1 - v, 1.5) / 0.68;
const landingTip = v => (v <= 0 || v >= 1) ? 0
  : smooth01(v / 0.2) * Math.sin(TAU * (v - 0.08)) * Math.pow(1 - v, 2) / 0.45;

export function createChristmasHatMotion(cfg = CHRISTMAS_HAT_MOTION) {
  return ({ elements, placementAt, duration, cfg: dog }) => {
    const paths = elements.filter(e => e.tagName.toLowerCase() === 'path');
    if (paths.length !== ROLES.length) return { apply() {} };   // a different hat drawing: no motion

    const [b0, b1] = cfg.band;
    const B = [(b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2];
    const tl = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]);
    const t = [(b1[0] - b0[0]) / tl, (b1[1] - b0[1]) / tl];   // along the band
    const n = [t[1], -t[0]];                                     // up, out of the band
    const H = cfg.crownHeight;
    const hg = cfg.hinge;
    const tipAxis = [cfg.tipEnd[0] - hg[0], cfg.tipEnd[1] - hg[1]];
    const tipLen = Math.hypot(tipAxis[0], tipAxis[1]);
    const ta = [tipAxis[0] / tipLen, tipAxis[1] / tipLen];

    const items = paths.map((el, i) => ({
      el, role: ROLES[i], under: UNDER_TIP[i], parsed: parsePath(el.getAttribute('d'))
    }));
    const pompomGroup = items.filter(it => it.role === POMPOM);

    const inertia = buildInertia({
      placementAt, duration, segment: dog.LOOP, settle: cfg.inertia.settle,
      anchor: [B[0] + n[0] * H * 0.5, B[1] + n[1] * H * 0.5],   // middle of the crown
      translation: cfg.inertia.crown,
      springs: {
        crown: { ...cfg.inertia.crown, axis: n, length: H },
        tip: { ...cfg.inertia.tip, axis: ta, length: tipLen }
      }
    });

    // --- deformation pieces (hat coordinates) ---
    const rot = (x, y, cx, cy, a) => {
      const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy;
      return [cx + c * dx - s * dy, cy + s * dx + c * dy];
    };
    const tipWeight = (x, y) => smooth01(((x - hg[0]) * ta[0] + (y - hg[1]) * ta[1]) / tipLen);
    let S = null;   // per-frame state
    const crownMap = (x, y) => {
      const qx = x - B[0], qy = y - B[1];
      const h = qx * n[0] + qy * n[1], l = qx * t[0] + qy * t[1];
      if (h <= 0) return [x, y];
      const wh = Math.min(1.25, h / H);
      // stretch out of the band (breath + hop), slight widening (breath), narrowing when stretched
      const up = h * (S.stretch + S.hop);
      const side = l * wh * (S.widen - S.hop * 0.4);
      const px = x + n[0] * up + t[0] * side, py = y + n[1] * up + t[1] * side;
      // crown tilt (lag), growing with height
      return rot(px, py, B[0], B[1], S.tilt * wh);
    };
    const tipMap = (x, y) => rot(x, y, hg[0], hg[1], S.tipAngle * tipWeight(x, y));

    function apply(info) {
      const time = info.time;
      const has = Number.isFinite(time);
      const loopT = has ? ((time % dog.LOOP) + dog.LOOP) % dog.LOOP : 0;
      const p = loopT / dog.LOOP;
      const g = info.pose || 0;

      // 2. breathing — the dog's own breathing curve (same phase and period)
      const k = has ? (1 - Math.cos(TAU * p * dog.breath.cycles)) / 2 : 0;
      // 3. inertia
      const lag = has ? inertia(time) : { x: 0, y: 0, crown: 0, tip: 0 };
      const I = cfg.inertia;
      const lagUp = lag.x * n[0] + lag.y * n[1];
      // 1. sway (+ the tip's own inertia)
      const sw = cfg.sway, ph = TAU * (p * sw.cycles + sw.phase);
      const sway = has ? sw.amp * (1 + sw.playBoost * g) * (0.86 * Math.sin(ph) + 0.14 * Math.sin(2 * ph - 0.7)) : 0;

      // 4. landing hop: in the block right after a block that ends by returning to pose 1
      let land = 0, landT = 0;
      if (has && cfg.landing) {
        const loc = locate(time, dog), order = dog.order;
        const prev = dog.blocks[order[(loc.idx - 1 + order.length) % order.length]];
        const last = prev.stages[prev.stages.length - 1];
        if (last.from === 1 && last.to === 0) {
          const v = loc.local / cfg.landing.dur;
          land = cfg.landing.hop * landingCurve(v);
          landT = cfg.landing.tipDeg * RAD * landingTip(v);
        }
      }

      S = {
        stretch: cfg.breath.stretch * k,
        widen: cfg.breath.widen * k,
        hop: softLimit(I.hop * lagUp / H, I.maxHop) + land,
        tilt: softLimit(I.crownTilt * lag.crown, I.maxCrownTiltDeg * RAD),
        tipAngle: sway * RAD + softLimit(I.tipSwing * lag.tip, I.maxTipSwingDeg * RAD) + landT
      };

      for (const it of items) {
        if (it.role === BAND || it.role === POMPOM) continue;
        const map = it.role === TIP
          ? (x, y) => { const [a, b] = tipMap(x, y); return crownMap(a, b); }
          : it.under
            ? (x, y) => { if (it.under(x, y)) { const [a, b] = tipMap(x, y); return crownMap(a, b); } return crownMap(x, y); }
            : crownMap;
        it.el.setAttribute('d', buildPath(it.parsed, map));
      }

      // Pompom rides on the tip end: moved and turned with it, breathes a touch
      const c0 = cfg.tipEnd;
      const [c1x, c1y] = tipMap(c0[0], c0[1]);
      const [c2x, c2y] = crownMap(c1x, c1y);
      const qh = ((c1x - B[0]) * n[0] + (c1y - B[1]) * n[1]) / H;
      const ang = (S.tipAngle * tipWeight(c0[0], c0[1]) + S.tilt * Math.max(0, Math.min(1.25, qh))) / RAD;
      const sc = 1 + cfg.breath.pompom * k;
      const tf = `translate(${(c2x).toFixed(3)} ${(c2y).toFixed(3)}) rotate(${ang.toFixed(3)}) scale(${sc.toFixed(4)}) translate(${(-c0[0]).toFixed(3)} ${(-c0[1]).toFixed(3)})`;
      pompomGroup.forEach(it => it.el.setAttribute('transform', tf));
    }

    return { apply };
  };
}
