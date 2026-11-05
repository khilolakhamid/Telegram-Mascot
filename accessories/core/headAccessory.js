/**
 * Head accessory engine (framework-agnostic).
 *
 * Puts an accessory SVG on the head of a dog drawn by `createDogAnimation` (../../mascot) without
 * touching the mascot's code or files. The accessory is added at runtime as its own group inside the
 * dog's `head-rig` group, so it automatically inherits everything applied to the head rig
 * (head turn, breathing lift). On top of that it follows the head's pose transform
 * (pose 1 ⇄ pose 2 morph), using the same rig data and the same per-part timing as the head itself —
 * so it moves frame-for-frame with the head: no sliding, no lag, no jumps.
 *
 *   const acc = createHeadAccessory(svg, { markup, placement });
 *   acc.update(info);        // call on every dog frame with the onFrame info ({ time, pose })
 *   acc.setVisible(false);   // hide / show
 *   acc.destroy();           // remove from the dog
 *
 * `placement` is measured on the reference images:
 *   pose1: { x, y, rotate }   where the accessory's SVG origin (0,0) sits in the dog's 240×240 frame
 *   pose2: { x, y, rotate }   in pose 1 and pose 2; `rotate` (degrees) turns it around that origin.
 *                             Optional `scale` in a pose: the size in that pose, when the reference
 *                             shows it different (eased from one to the other together with the head).
 *   scale: number             accessory units → dog units (1 = the SVG's own size)
 *   pivot: [x, y]             (optional) point in pose-1 dog coords around which the small pose-2
 *                             fine-tuning turns; defaults to the accessory's centre.
 */
import { PoseMorph } from '../../mascot/animations/poseMorph.js';
import MORPH_DATA from '../../mascot/animations/dogMorphData.json';
import { DOG_ANIMATION_CONFIG as DOG_CFG, locate, sequenceDuration } from '../../mascot/animations/dogAnimation.js';

const NS = 'http://www.w3.org/2000/svg';
const RAD = Math.PI / 180;

// 2D affine as [a, b, c, d, e, f] (SVG matrix order): x' = a·x + c·y + e, y' = b·x + d·y + f
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]
];
const inv = m => {
  const det = m[0] * m[3] - m[1] * m[2];
  const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
};
const place = ({ x, y, rotate = 0 }, s = 1) => {
  const c = Math.cos(rotate * RAD) * s, n = Math.sin(rotate * RAD) * s;
  return [c, n, -n, c, x, y];
};
const rotAbout = (deg, px, py, k = 1) => {   // rotation (and scale k) about (px, py)
  const c = Math.cos(deg * RAD) * k, n = Math.sin(deg * RAD) * k;
  return [c, n, -n, c, px - c * px + n * py, py - n * px - c * py];
};
// Pose transform of a dog part as a matrix (from the rig's M(x, y) function)
const partMatrix = T => {
  const [e, f] = T.M(0, 0), [ax, ay] = T.M(1, 0), [cx, cy] = T.M(0, 1);
  return [ax - e, ay - f, cx - e, cy - f, e, f];
};

let instanceCount = 0;
const URL_ATTRS = ['fill', 'stroke', 'clip-path', 'mask', 'filter', 'marker-start', 'marker-mid', 'marker-end'];
/** Gives every id inside `root` a unique prefix and updates url(#…) / href references to it. */
function uniquifyIds(root, prefix) {
  const withId = root.querySelectorAll('[id]');
  if (!withId.length) return;
  const map = {};
  withId.forEach(el => { map[el.id] = `${prefix}-${el.id}`; el.id = map[el.id]; });
  root.querySelectorAll('*').forEach(el => {
    URL_ATTRS.forEach(a => {
      const v = el.getAttribute(a);
      if (v && v.includes('url(#')) el.setAttribute(a, v.replace(/url\(#([^)]+)\)/g, (m, id) => (map[id] ? `url(#${map[id]})` : m)));
    });
    ['href', 'xlink:href'].forEach(a => {
      const v = el.getAttribute(a);
      if (v && v[0] === '#' && map[v.slice(1)]) el.setAttribute(a, '#' + map[v.slice(1)]);
    });
  });
}

/** Parses accessory SVG markup; returns its child nodes and root presentation attributes. */
function parseMarkup(markup, doc) {
  const Parser = doc.defaultView && doc.defaultView.DOMParser;
  const src = new Parser().parseFromString(markup, 'image/svg+xml').documentElement;
  if (!src || src.nodeName !== 'svg') throw new Error('headAccessory: markup is not an <svg>');
  const vb = (src.getAttribute('viewBox') || `0 0 ${src.getAttribute('width')} ${src.getAttribute('height')}`)
    .split(/[\s,]+/).map(Number);
  return { nodes: Array.from(src.childNodes), viewBox: vb, fill: src.getAttribute('fill') };
}

/**
 * @param {SVGSVGElement} svg   the dog's <svg> (already built by createDogAnimation / <DogMascot>)
 * @param {object} opts
 * @param {string} opts.markup  accessory SVG source (kept exactly as designed)
 * @param {object} opts.placement  see header
 * @param {string} [opts.name='accessory']  value of data-accessory on the inserted group
 * @param {string} [opts.part='head']  dog part whose pose transform the accessory follows
 * @param {string} [opts.layer='over-head']  'over-head': drawn over the head and ears (hats);
 *                                  'under-head': drawn under the head and ears, over the body and
 *                                  legs (things held in the mouth: the muzzle overlaps them)
 * @param {number} [opts.pose=0]  initial pose progress
 * @param {number} [opts.time]    initial sequence time (for secondary motion)
 * @param {function} [opts.motion]  ({ elements, placementAt, duration, cfg }) → { apply(info) }:
 *                                  secondary motion of the accessory's own shapes
 */
export function createHeadAccessory(svg, opts) {
  const { markup, placement, name = 'accessory', part = 'head', layer = 'over-head' } = opts;
  const doc = svg.ownerDocument;
  const headRig = svg.querySelector('[data-part="head-rig"]');
  if (!headRig) throw new Error('headAccessory: the dog is not drawn in this <svg> yet');

  const rig = PoseMorph.makeRig(MORPH_DATA);
  const s = placement.scale ?? 1;
  const { nodes, viewBox, fill } = parseMarkup(markup, doc);

  // Where the accessory sits in pose 1 (H1) and pose 2 (H2), in dog coordinates.
  const s1 = placement.pose1.scale ?? s, s2 = placement.pose2.scale ?? s;
  const H1 = place(placement.pose1, s1);
  const H2 = place(placement.pose2, s2);
  // The head's own pose-2 transform; whatever the reference adds on top of it is a small fine-tuning
  // (the head contour itself morphs a little), expressed in pose-1 coordinates and eased in with the head.
  const Mhead2 = partMatrix(PoseMorph.solve(rig, 1)[part]);
  const C = mul(mul(inv(Mhead2), H2), inv(H1));
  const corrDeg = Math.atan2(C[1], C[0]) / RAD;
  const corrScale = s1 === s2 ? 1 : Math.hypot(C[0], C[1]);   // size change between the poses, if any
  const pivot = placement.pivot || [
    H1[4] + (viewBox[0] + viewBox[2] / 2) * s1, H1[5] + (viewBox[1] + viewBox[3] / 2) * s1
  ];
  const turned = rotAbout(corrDeg, pivot[0], pivot[1], corrScale);
  const corrShift = [C[4] - turned[4], C[5] - turned[5]];

  // DOM: <g data-accessory=…  transform=pose-follow> <g transform=placement> …original nodes… </g></g>
  const outer = doc.createElementNS(NS, 'g');
  outer.setAttribute('data-accessory', name);
  const inner = doc.createElementNS(NS, 'g');
  inner.setAttribute('fill', fill || 'none');
  nodes.forEach(n => inner.appendChild(doc.importNode(n, true)));
  outer.appendChild(inner);
  uniquifyIds(outer, `${name}-${++instanceCount}`);   // several dogs on one page: no id clashes
  if (layer === 'under-head') headRig.insertBefore(outer, headRig.firstChild);   // under head and ears
  else headRig.appendChild(outer);   // last in the head rig → drawn over the head and ears

  // Accessory → dog matrix for pose progress g (follows the head's pose transform; no head turn)
  function poseMatrix(pose) {
    const T = PoseMorph.solve(rig, pose)[part];
    const k = T.t;   // the head's own eased progress → the accessory never leads or lags the head
    const corr = mul([1, 0, 0, 1, corrShift[0] * k, corrShift[1] * k],
      rotAbout(corrDeg * k, pivot[0], pivot[1], 1 + (corrScale - 1) * k));
    return { m: mul(mul(partMatrix(T), corr), H1), T };
  }
  // The same, plus the dog's head turn — the full motion of the accessory at sequence time t.
  // (In the DOM the head turn comes from the head-rig group itself; this is for motion planning.)
  function placementAt(time) {
    const loc = locate(time, DOG_CFG);
    const g = loc.stage.from + (loc.stage.to - loc.stage.from) * loc.u;
    const { m } = poseMatrix(g);
    const h = DOG_CFG.headTurn;
    if (!loc.block.headTurn) return m;
    const p = loc.local / DOG_CFG.LOOP, inPose1 = 1 - PoseMorph.smooth(g / 0.5);
    const ease = (x, a, b) => PoseMorph.smooth((x - a) / (b - a));
    const hk = (ease(p, h.turnStart, h.turnEnd) - ease(p, h.backStart, h.backEnd)) * inPose1;
    if (!hk) return m;
    const [hx, hy] = PoseMorph.solve(rig, g)[h.part].M(h.origin[0], h.origin[1]);
    return mul(mul([1, 0, 0, 1, h.shiftX * hk, 0], rotAbout(h.angle * hk, hx, hy)), m);
  }

  // Optional secondary motion of the accessory itself (sway, breathing, inertia): it reshapes the
  // accessory's own elements; the placement above stays exactly as measured.
  const elements = Array.from(inner.children);
  const motion = opts.motion ? opts.motion({ elements, placementAt, duration: sequenceDuration(DOG_CFG), cfg: DOG_CFG }) : null;

  let lastPose = NaN;
  const acc = {
    element: outer,
    /**
     * Call on every dog frame with the dog's onFrame info ({ time, pose, … }).
     * A bare number is accepted as the pose (placement only, no time-based secondary motion).
     */
    update(info) {
      const f = typeof info === 'number' ? { pose: info } : info;
      if (f.pose !== lastPose) {
        lastPose = f.pose;
        const { m } = poseMatrix(f.pose);
        inner.setAttribute('transform', `matrix(${m.map(v => +v.toFixed(5)).join(' ')})`);
      }
      if (motion) motion.apply(f);
    },
    setVisible(v) { outer.style.display = v ? '' : 'none'; },
    isAttached: () => !!outer.parentNode && outer.ownerDocument.contains(outer),
    destroy() { if (outer.parentNode) outer.parentNode.removeChild(outer); }
  };
  acc.update({ pose: opts.pose ?? 0, time: opts.time });
  return acc;
}
