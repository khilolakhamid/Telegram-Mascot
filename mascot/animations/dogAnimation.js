/**
 * PawMotion dog — animation engine (framework-agnostic).
 *
 *   const dog = createDogAnimation(svgElement, { autoPlay: true });
 *   dog.play(); dog.pause(); dog.seek(9.5); dog.destroy();
 *
 * Draws the dog into the given <svg> (viewBox 0 0 240 240) and runs the 12-second behaviour:
 * three 3-second "pose 1" blocks, then one 3-second "play" block (crouch → bow → return).
 * Every block is ≤ 3 s, so each one can later be exported as its own Telegram TGS animation.
 *
 * Motions: breathing, ears, tail, blinking, head turn, head shadow, pose 1 ⇄ pose 2 morph.
 * All geometry comes from the original SVGs (see ../assets and ../tools/build_morph_data.py).
 */
import { PoseMorph } from './poseMorph.js';
import MORPH_DATA from './dogMorphData.json';

/* ============================================================
   SETTINGS
   Every periodic motion completes a whole number of cycles per
   3-second block, so blocks join without a jump. Pivot points
   are given in pose-1 coordinates; in pose 2 and in between they
   are carried by their body part, so motions work in any pose.
   ============================================================ */
export const DOG_ANIMATION_CONFIG = {
  LOOP: 3.0, FPS: 60,
  // Two 3-second blocks. stages: pose progress inside the block, from/to — 0 (pose 1) … 1 (pose 2).
  blocks: {
    pose1: { name: 'pose 1', headTurn: true, blink: true,
             stages: [{ name: 'pose 1', dur: 3.0, from: 0, to: 0 }] },
    play:  { name: 'play', headTurn: false, blink: false,
             stages: [{ name: 'crouch', dur: 0.5, from: 0, to: 1 },
                      { name: 'pose 2', dur: 2.0, from: 1, to: 1 },
                      { name: 'return', dur: 0.5, from: 1, to: 0 }] }
  },
  // Behaviour sequence: 3 × pose 1, then the play block → 12 s
  order: ['pose1', 'pose1', 'pose1', 'play'],
  // Springy settle of the body right after the crouch
  settle: { dur: 0.32, squashY: 0.028, stretchX: 0.012 },
  // The tail wags a little more while in the play pose
  tailPlayBoost: 0.6,
  breath:   { cycles: 1, scaleX: 0.012, scaleY: 0.022, origin: [118, 212], part: 'body' },
  earLeft:  { cycles: 1, amp: 5,   origin: [72, 54],   part: 'earL' },
  earRight: { cycles: 1, amp: 4.5, origin: [136, 47],  part: 'earR' },
  tail:     { cycles: 2, amp: 6,   origin: [157, 186], part: 'tail' },
  // Head shadow: how far below the muzzle edge it lies (px); each shadow point takes the
  // displacement of the head point above it, so it shifts and tilts with the head.
  headShadow: { drop: 9, follow: 1.0 },
  // Blink: once per pose-1 block, as the head starts to turn. Closing is faster than opening (~200 ms).
  // Each eye squeezes vertically around its own centre, in the head's coordinate system.
  blink: { start: 0.155, close: 0.025, hold: 0.012, open: 0.03, minScale: 0.1 },
  // Pose-1 block: a small turn of the head to the left, a short look, and back
  headTurn: { angle: -6, shiftX: -3, origin: [106, 138], part: 'head',
              turnStart: 0.18, turnEnd: 0.40, backStart: 0.66, backEnd: 0.90 }
};

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
const LAYERS = ['backL', 'tail', 'body', 'bridge', 'frontL', 'frontR', 'bodyOver', 'backR'];
const fx = v => v.toFixed(3);
const wrap = (x, m) => ((x % m) + m) % m;
const ease = (x, a, b) => PoseMorph.smooth((x - a) / (b - a));
const playful = p => 0.82 * Math.sin(TAU * p) + 0.18 * Math.sin(2 * TAU * p);
const breathe = p => (1 - Math.cos(TAU * p)) / 2;
let instanceCount = 0;

/* ---- Sequence helpers (pure; exported for tooling and tests) ---- */
export function sequenceDuration(cfg = DOG_ANIMATION_CONFIG) { return cfg.LOOP * cfg.order.length; }

/** Where `time` falls in the sequence: block index, block, time inside the block, stage. */
export function locate(time, cfg = DOG_ANIMATION_CONFIG) {
  const total = sequenceDuration(cfg), T = wrap(time, total);
  const idx = Math.min(cfg.order.length - 1, Math.floor(T / cfg.LOOP));
  const block = cfg.blocks[cfg.order[idx]], local = T - idx * cfg.LOOP;
  return { idx, key: cfg.order[idx], block, local, ...stageAt(block, local) };
}

function stageAt(block, local) {
  let s = local;
  for (const st of block.stages) { if (s < st.dur) return { stage: st, u: s / st.dur }; s -= st.dur; }
  return { stage: block.stages[block.stages.length - 1], u: 1 };
}

/** Pose progress g (0 = pose 1, 1 = pose 2). Easing of each body part is built into the morph. */
export function poseAt(time, cfg = DOG_ANIMATION_CONFIG) {
  const { stage, u } = locate(time, cfg);
  return stage.from + (stage.to - stage.from) * u;
}

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
 * Builds the dog inside `svg` and returns a controller.
 * @param {SVGSVGElement} svg  target element; its contents are replaced
 * @param {object} [options]
 * @param {boolean} [options.autoPlay=true]
 * @param {number}  [options.startTime=0]  seconds into the 12-second sequence
 * @param {(info:{time:number, blockIndex:number, block:string, stage:string, pose:number})=>void} [options.onFrame]
 * @param {object}  [options.config]  overrides merged into DOG_ANIMATION_CONFIG (shallow)
 */
export function createDogAnimation(svg, options = {}) {
  const cfg = { ...DOG_ANIMATION_CONFIG, ...(options.config || {}) };
  const total = sequenceDuration(cfg);
  const uid = 'pawdog' + (++instanceCount);   // unique ids: several dogs can live on one page
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
  LAYERS.forEach(n => (groups[n] = mk('g', svg, { 'data-part': n })));
  groups.headRig = mk('g', svg, { 'data-part': 'head-rig' });
  ['head', 'earR', 'earL'].forEach(n => (groups[n] = mk('g', groups.headRig, { 'data-part': n })));
  const defs = mk('defs', svg);

  // Nodes in render order (the morph core decides layering: shadow over shoulders, bridge under legs)
  const nodes = PoseMorph.frame(rig, 0).els.map((e, i) => {
    const n = { path: mk('path', groups[e.layer], { 'stroke-linecap': 'round' }), layer: e.layer, part: e.part, isFill: !!e.fill };
    if (e.grad) {
      const id = `${uid}-grad-${e.layer}-${i}`;
      n.grad = mk('linearGradient', defs, { id, gradientUnits: 'userSpaceOnUse' });
      n.stops = e.grad.stops.map(() => mk('stop', n.grad));
      n.path.setAttribute('stroke', `url(#${id})`);
    }
    if (e.grad || e.stroke) n.path.setAttribute('stroke-width', 6);
    return n;
  });

  // Head shadow: recomputed every frame from the head, clipped to the body silhouette (TGS: Alpha Matte)
  const shadowNode = nodes.find(n => n.layer === 'bodyOver');
  const bodyFillNode = nodes.find(n => n.part === 'body' && n.layer === 'body' && n.isFill);
  const clipId = `${uid}-body-clip`;
  const clipShape = mk('path', mk('clipPath', defs, { id: clipId }));
  shadowNode.path.setAttribute('clip-path', `url(#${clipId})`);
  let shadowP = null, shadowClosed = true;

  // Eyes: 4th and 5th head elements (after the outline fill, outline stroke and nose)
  const eyeNodes = nodes.filter(n => n.part === 'head').slice(3, 5);
  eyeNodes.forEach(n => (n.center = [0, 0]));

  function applyPose(g) {
    PoseMorph.frame(rig, g).els.forEach((e, i) => {
      const n = nodes[i], p = n.path;
      p.setAttribute('d', e.d);
      if (n === bodyFillNode) clipShape.setAttribute('d', e.d);
      if (n === shadowNode) { shadowP = e.P; shadowClosed = e.d.endsWith('Z'); }
      if (eyeNodes.includes(n)) n.center = bboxCenter(e.d);
      p.setAttribute('fill', e.fill || 'none');
      if (e.fill && e.fo !== 1) p.setAttribute('fill-opacity', e.fo.toFixed(3)); else p.removeAttribute('fill-opacity');
      if (e.stroke) p.setAttribute('stroke', e.stroke);
      p.style.display = e.opacity <= 0.001 ? 'none' : '';
      if (e.opacity < 1) p.setAttribute('opacity', e.opacity.toFixed(3)); else p.removeAttribute('opacity');
      if (e.grad) {
        const [x1, y1, x2, y2] = e.grad.p;
        n.grad.setAttribute('x1', x1.toFixed(2)); n.grad.setAttribute('y1', y1.toFixed(2));
        n.grad.setAttribute('x2', x2.toFixed(2)); n.grad.setAttribute('y2', y2.toFixed(2));
        e.grad.stops.forEach((s, k) => {
          const st = n.stops[k];
          st.setAttribute('offset', s.off.toFixed(3)); st.setAttribute('stop-color', s.c);
          if (s.o < 1) st.setAttribute('stop-opacity', s.o.toFixed(3)); else st.removeAttribute('stop-opacity');
        });
      }
    });
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

    const h = cfg.headTurn;
    const hk = block.headTurn ? (ease(p, h.turnStart, h.turnEnd) - ease(p, h.backStart, h.backEnd)) * inPose1 : 0;
    const lift = -(sy - 1) * (212 - 100) * inPose1;
    const [hx, hy] = pivot(h);
    groups.headRig.setAttribute('transform', `translate(${fx(h.shiftX * hk)} ${fx(lift)}) rotate(${fx(h.angle * hk)} ${fx(hx)} ${fx(hy)})`);
    updateShadow(h.shiftX * hk, h.angle * hk, hx, hy);

    const bl = cfg.blink, t1 = bl.start + bl.close, t2 = t1 + bl.hold, t3 = t2 + bl.open;
    const shut = block.blink ? (ease(p, bl.start, t1) - ease(p, t2, t3)) * inPose1 : 0;   // 0 open … 1 shut
    const eyeSy = 1 - (1 - bl.minScale) * shut;
    eyeNodes.forEach(n => {
      const [cx, cy] = n.center;
      if (shut > 0.0005) n.path.setAttribute('transform', `translate(${fx(cx)} ${fx(cy)}) scale(1 ${eyeSy.toFixed(4)}) translate(${fx(-cx)} ${fx(-cy)})`);
      else n.path.removeAttribute('transform');
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
