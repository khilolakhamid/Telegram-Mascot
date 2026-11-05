/**
 * Skeleton Dog — animation engine (framework-agnostic), a separate skin of the mascot.
 *
 *   const dog = createSkeletonAnimation(svgElement, { autoPlay: true });
 *   dog.play(); dog.pause(); dog.seek(9.5); dog.destroy();
 *
 * Draws the skeleton dog (its own SVG model: bones, ribs, vertebrae, glows) into the given <svg>
 * (viewBox 0 0 240 240) and runs the same 12-second behaviour as the Original Dog:
 * three 3-second "pose 1" blocks, then one 3-second "play" block (crouch → bow → return).
 * Every block is ≤ 3 s, so each one can later be exported as its own Telegram TGS animation.
 *
 * Motions: breathing, ears, tail, blinking, head turn, head shadow, pose 1 ⇄ pose 2 morph.
 * Every bone belongs to its body part, so it moves, turns and morphs with it; body bones breathe with
 * the body, vertebrae wag with the tail. Geometry: ../assets, built by ../tools/build_skeleton_data.py.
 */
import { PoseMorph } from './skeletonMorph.js';
import MORPH_DATA from './skeletonMorphData.json';
import { DOG_ANIMATION_CONFIG, sequenceDuration as baseDuration, locate as baseLocate } from '../../../animations/dogAnimation.js';

/* ============================================================
   SETTINGS
   Every periodic motion completes a whole number of cycles per
   3-second block, so blocks join without a jump. Pivot points
   are given in pose-1 coordinates; in pose 2 and in between they
   are carried by their body part, so motions work in any pose.
   ============================================================ */
// Behaviour is shared with the Original Dog (read only): same blocks, order, timing, amplitudes and pivots.
// A skin changes the visual model, never the behaviour.
export const SKELETON_ANIMATION_CONFIG = DOG_ANIMATION_CONFIG;

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
const LAYERS = ['backL', 'tail', 'body', 'bodyOver', 'bodyTop', 'frontL', 'frontR', 'backR'];
const fx = v => v.toFixed(3);
const wrap = (x, m) => ((x % m) + m) % m;
const ease = (x, a, b) => PoseMorph.smooth((x - a) / (b - a));
const playful = p => 0.82 * Math.sin(TAU * p) + 0.18 * Math.sin(2 * TAU * p);
const breathe = p => (1 - Math.cos(TAU * p)) / 2;
let instanceCount = 0;

/* ---- Sequence helpers: the Original Dog's, so both skins share one timeline ---- */
export const sequenceDuration = (cfg = SKELETON_ANIMATION_CONFIG) => baseDuration(cfg);
export const locate = (time, cfg = SKELETON_ANIMATION_CONFIG) => baseLocate(time, cfg);

function settleAt(local, block, cfg) {
  if (block.stages[0].to !== 1) return 0;
  const s = local - block.stages[0].dur, d = cfg.settle.dur;
  if (s <= 0 || s >= d) return 0;
  const u = s / d; return Math.sin(Math.PI * u) * (1 - u) * 1.54;
}

const bboxCenter = d => {
  const v = d.match(/-?\d*\.?\d+(?:e-?\d+)?/g).map(Number);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < v.length; i += 2) {
    x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i]); y0 = Math.min(y0, v[i + 1]); y1 = Math.max(y1, v[i + 1]);
  }
  return [(x0 + x1) / 2, (y0 + y1) / 2];
};

/**
 * Builds the skeleton dog inside `svg` and returns a controller (same API as the Original Dog).
 * @param {SVGSVGElement} svg  target element; its contents are replaced
 * @param {object} [options]
 * @param {boolean} [options.autoPlay=true]
 * @param {number}  [options.startTime=0]  seconds into the 12-second sequence
 * @param {(info:{time:number, blockIndex:number, block:string, stage:string, pose:number})=>void} [options.onFrame]
 * @param {object}  [options.config]  overrides merged into SKELETON_ANIMATION_CONFIG (shallow)
 */
export function createSkeletonAnimation(svg, options = {}) {
  const cfg = { ...SKELETON_ANIMATION_CONFIG, ...(options.config || {}) };
  const total = sequenceDuration(cfg);
  const uid = 'skeldog' + (++instanceCount);   // unique ids: several dogs can live on one page
  const rig = PoseMorph.makeRig(MORPH_DATA);
  const doc = svg.ownerDocument;
  const win = doc.defaultView;

  /* ---- SVG scaffold: body-part groups, original contours inside ---- */
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('viewBox', '0 0 240 240');
  svg.setAttribute('fill', 'none');
  const mk = (tag, parent, attrs = {}) => {
    const e = doc.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e); return e;
  };
  const groups = {};
  const ground = mk('ellipse', svg, { 'data-part': 'ground-shadow' });   // drawn first: always behind the dog
  LAYERS.forEach(n => (groups[n] = mk('g', svg, { 'data-part': n })));
  groups.headRig = mk('g', svg, { 'data-part': 'head-rig' });
  ['head', 'earR', 'earL', 'face'].forEach(n => (groups[n] = mk('g', groups.headRig, { 'data-part': n })));
  const defs = mk('defs', svg);
  {
    const gs = cfg.groundShadow, id = `${uid}-ground`;
    const rg = mk('radialGradient', defs, { id, cx: 0.5, cy: 0.5, r: 0.5 });   // objectBoundingBox: fits the ellipse
    [[0, 1], [0.5, 0.62], [1, 0]].forEach(([off, k]) =>
      mk('stop', rg, { offset: off, 'stop-color': gs.color, 'stop-opacity': (gs.opacity * k).toFixed(3) }));
    ground.setAttribute('fill', `url(#${id})`);
  }

  // Nodes in render order (layers: body → head shadow → body outline and bones → legs)
  let gradCount = 0;
  const makePaint = (paint, path, attr) => {
    if (!paint || paint.type === 'solid') return null;
    const id = `${uid}-grad-${gradCount++}`;
    const el = paint.type === 'lin'
      ? mk('linearGradient', defs, { id, gradientUnits: 'userSpaceOnUse' })
      : mk('radialGradient', defs, { id, gradientUnits: 'userSpaceOnUse', cx: 0, cy: 0, r: 1 });
    path.setAttribute(attr, `url(#${id})`);
    return { el, stops: paint.stops.map(() => mk('stop', el)) };
  };
  const setPaint = (paint, g, path, attr) => {
    if (!paint) { path.setAttribute(attr, 'none'); return; }
    if (paint.type === 'solid') { path.setAttribute(attr, paint.c); return; }
    if (paint.type === 'lin') {
      const [x1, y1, x2, y2] = paint.p;
      g.el.setAttribute('x1', x1.toFixed(2)); g.el.setAttribute('y1', y1.toFixed(2));
      g.el.setAttribute('x2', x2.toFixed(2)); g.el.setAttribute('y2', y2.toFixed(2));
    } else {
      g.el.setAttribute('gradientTransform', `matrix(${paint.m.map(v => v.toFixed(4)).join(' ')})`);
    }
    paint.stops.forEach((st, k) => {
      const e = g.stops[k];
      e.setAttribute('offset', st.off.toFixed(3)); e.setAttribute('stop-color', st.c);
      if (st.o < 1) e.setAttribute('stop-opacity', st.o.toFixed(3)); else e.removeAttribute('stop-opacity');
    });
  };
  const f0 = PoseMorph.frame(rig, 0).els, f1 = PoseMorph.frame(rig, 1).els;
  const nodes = f0.map((e, i) => {
    const path = mk('path', groups[e.layer], { 'stroke-linecap': 'round' });
    const n = { path, layer: e.layer, part: e.part, isFill: !!e.fill, eye: e.eye, eyeBase: e.eyeBase };
    n.fillGrad = makePaint(e.fill, path, 'fill');
    n.strokeGrad = makePaint(e.stroke, path, 'stroke');
    if (Math.max(e.blur, f1[i].blur) > 0) {
      // glow: Gaussian blur; the filter region is relative to the shape, so it follows the morph
      const id = `${uid}-glow-${gradCount++}`;
      const f = mk('filter', defs, { id, x: '-150%', y: '-150%', width: '400%', height: '400%', 'color-interpolation-filters': 'sRGB' });
      n.blur = mk('feGaussianBlur', f, { stdDeviation: e.blur });
      path.setAttribute('filter', `url(#${id})`);
    }
    if (e.clipD !== undefined) {   // inner rims of the muzzle and nose: clipped by their own shape (TGS: Alpha Matte)
      const id = `${uid}-clip-${gradCount++}`;
      n.clipShape = mk('path', mk('clipPath', defs, { id }));
      path.setAttribute('clip-path', `url(#${id})`);
    }
    return n;
  });

  // Head shadow: recomputed every frame from the head, clipped to the body silhouette (TGS: Alpha Matte)
  const shadowNode = nodes.find(n => n.layer === 'bodyOver');
  const bodyFillNode = nodes.find(n => n.part === 'body' && n.layer === 'body' && n.isFill);
  const clipId = `${uid}-body-clip`;
  const clipShape = mk('path', mk('clipPath', defs, { id: clipId }));
  shadowNode.path.setAttribute('clip-path', `url(#${clipId})`);
  let shadowP = null, shadowClosed = true;

  // Eyes: each eye is several layers (base, gradient, highlight); they blink together around the base's centre
  const eyes = ['R', 'L'].map(k => ({ nodes: nodes.filter(n => n.eye === k), base: nodes.find(n => n.eye === k && n.eyeBase), center: [0, 0] }));

  function applyPose(g) {
    PoseMorph.frame(rig, g).els.forEach((e, i) => {
      const n = nodes[i], p = n.path;
      p.setAttribute('d', e.d);
      if (n === bodyFillNode) clipShape.setAttribute('d', e.d);
      if (n === shadowNode) { shadowP = e.P; shadowClosed = e.d.endsWith('Z'); }
      if (n.clipShape) n.clipShape.setAttribute('d', e.clipD);
      setPaint(e.fill, n.fillGrad, p, 'fill');
      if (e.stroke) { setPaint(e.stroke, n.strokeGrad, p, 'stroke'); p.setAttribute('stroke-width', e.sw.toFixed(3)); }
      if (n.blur) n.blur.setAttribute('stdDeviation', e.blur.toFixed(3));
      if (e.fill && e.fo !== 1) p.setAttribute('fill-opacity', e.fo.toFixed(3)); else p.removeAttribute('fill-opacity');
      p.style.display = e.opacity <= 0.001 ? 'none' : '';
      if (e.opacity < 1) p.setAttribute('opacity', e.opacity.toFixed(3)); else p.removeAttribute('opacity');
    });
    eyes.forEach(eye => { eye.center = bboxCenter(eye.base.path.getAttribute('d')); });
    fitGroundShadow();
  }

  // Soft lowest point of a leg: points weighted toward the bottom, so the contact slides smoothly
  // (no jump when another point of the paw becomes the lowest one).
  const LEG_PARTS = ['backL', 'frontL', 'frontR', 'backR'];
  function pawOf(part) {
    let my = -Infinity; const pts = [];
    nodes.forEach(n => {
      if (n.part !== part || !n.isFill) return;
      const v = n.path.getAttribute('d').match(/-?\d*\.?\d+(?:e-?\d+)?/g).map(Number);
      for (let i = 0; i + 1 < v.length; i += 2) { pts.push([v[i], v[i + 1]]); if (v[i + 1] > my) my = v[i + 1]; }
    });
    let sw = 0, sx = 0, sy = 0;
    pts.forEach(([x, y]) => { const w = Math.exp((y - my) / 3); sw += w; sx += w * x; sy += w * y; });
    return [sx / sw, sy / sw];
  }
  function fitGroundShadow() {
    const gs = cfg.groundShadow, paws = LEG_PARTS.map(pawOf);
    const xs = paws.map(p => p[0]), ys = paws.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length + gs.drop;
    ground.setAttribute('cx', ((x0 + x1) / 2).toFixed(2));
    ground.setAttribute('cy', cy.toFixed(2));
    ground.setAttribute('rx', ((x1 - x0) / 2 + gs.margin).toFixed(2));
    ground.setAttribute('ry', (gs.ryBase + gs.ryFromSpread * (y1 - y0)).toFixed(2));
  }

  function updateShadow(dx, deg, px, py) {
    if (!shadowP) return;
    const D = cfg.headShadow.drop, k = cfg.headShadow.follow;
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    let d = '';
    for (let i = 0, j = 0; i < shadowP.length; i += 2, j++) {
      const x = shadowP[i], y = shadowP[i + 1];
      const sx = x - px, sy = y - D - py;   // head point above this shadow point
      const mx = c * sx - s * sy + px + dx - x, my = s * sx + c * sy + py - (y - D);
      d += (j === 0 ? 'M' : (j % 3 === 1 ? 'C' : ' ')) + (x + mx * k).toFixed(2) + ' ' + (y + my * k).toFixed(2);
    }
    shadowNode.path.setAttribute('d', shadowClosed ? d + 'Z' : d);
  }

  // Living motion on top of the current pose
  function applyIdle(local, g, block) {
    const T = PoseMorph.solve(rig, g);
    const pivot = c => T[c.part].M(c.origin[0], c.origin[1]);
    const p = wrap(local, cfg.LOOP) / cfg.LOOP;
    const inPose1 = 1 - PoseMorph.smooth(g / 0.5);   // head turn and blink belong to pose 1

    const b = cfg.breath, k = breathe(p * b.cycles), [bx, by] = pivot(b);
    const st = settleAt(local, block, cfg), sq = cfg.settle;
    const sx = 1 + b.scaleX * k + sq.stretchX * st, sy = 1 + b.scaleY * k - sq.squashY * st;
    const breath = `translate(${fx(bx)} ${fx(by)}) scale(${sx.toFixed(5)} ${sy.toFixed(5)}) translate(${fx(-bx)} ${fx(-by)})`;
    groups.body.setAttribute('transform', breath);
    groups.bodyOver.setAttribute('transform', breath);   // the head shadow sits on the breathing body
    groups.bodyTop.setAttribute('transform', breath);    // body outline and body bones breathe with the body

    const h = cfg.headTurn;
    const hk = block.headTurn ? (ease(p, h.turnStart, h.turnEnd) - ease(p, h.backStart, h.backEnd)) * inPose1 : 0;
    const lift = -(sy - 1) * (212 - 100) * inPose1;
    const [hx, hy] = pivot(h);
    groups.headRig.setAttribute('transform', `translate(${fx(h.shiftX * hk)} ${fx(lift)}) rotate(${fx(h.angle * hk)} ${fx(hx)} ${fx(hy)})`);
    updateShadow(h.shiftX * hk, h.angle * hk, hx, hy);

    const bl = cfg.blink, t1 = bl.start + bl.close, t2 = t1 + bl.hold, t3 = t2 + bl.open;
    const shut = block.blink ? (ease(p, bl.start, t1) - ease(p, t2, t3)) * inPose1 : 0;   // 0 open … 1 shut
    const eyeSy = 1 - (1 - bl.minScale) * shut;
    eyes.forEach(eye => {
      const [cx, cy] = eye.center;
      const tf = `translate(${fx(cx)} ${fx(cy)}) scale(1 ${eyeSy.toFixed(4)}) translate(${fx(-cx)} ${fx(-cy)})`;
      eye.nodes.forEach(n => { if (shut > 0.0005) n.path.setAttribute('transform', tf); else n.path.removeAttribute('transform'); });
    });

    const eL = cfg.earLeft, eR = cfg.earRight, tl = cfg.tail;
    const [lx, ly] = pivot(eL), [rx, ry] = pivot(eR), [tx, ty] = pivot(tl);
    groups.earL.setAttribute('transform', `rotate(${fx(-eL.amp * playful(p * eL.cycles))} ${fx(lx)} ${fx(ly)})`);
    groups.earR.setAttribute('transform', `rotate(${fx(eR.amp * playful(p * eR.cycles))} ${fx(rx)} ${fx(ry)})`);
    const tailAmp = tl.amp * (1 + cfg.tailPlayBoost * g);
    groups.tail.setAttribute('transform', `rotate(${fx(tailAmp * Math.sin(TAU * p * tl.cycles))} ${fx(tx)} ${fx(ty)})`);
  }

  /* ---- Transport ---- */
  let time = wrap(options.startTime || 0, total), playing = false, last = 0, raf = 0, drawnG = -1, destroyed = false;

  function draw() {
    const loc = locate(time, cfg);
    const g = loc.stage.from + (loc.stage.to - loc.stage.from) * loc.u;
    if (g !== drawnG) { applyPose(g); drawnG = g; }
    applyIdle(loc.local, g, loc.block);
    if (options.onFrame) options.onFrame({ time, blockIndex: loc.idx, block: loc.key, stage: loc.stage.name, pose: g });
  }
  function tick(now) {
    if (!playing) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    time = (time + dt) % total;   // endless repetition of the whole sequence
    draw();
    raf = win.requestAnimationFrame(tick);
  }

  const controller = {
    play() {
      if (playing || destroyed) return;
      playing = true; last = win.performance.now();
      raf = win.requestAnimationFrame(tick);
    },
    pause() { playing = false; win.cancelAnimationFrame(raf); },
    isPlaying: () => playing,
    /** Jump to `t` seconds in the 12-second sequence (keeps play/pause state). */
    seek(t) { time = wrap(t, total); draw(); },
    getTime: () => time,
    duration: total,
    destroy() { controller.pause(); destroyed = true; while (svg.firstChild) svg.removeChild(svg.firstChild); }
  };

  draw();   // first frame = original pose-1 SVG
  if (options.autoPlay !== false) controller.play();
  return controller;
}
