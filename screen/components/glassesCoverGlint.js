// Lens glint for the glasses' card cover: the same "whoosh" as the real accessory
// (accessories/eyes/glasses/glassesMotion.js) — two parallel light stripes clipped to each lens,
// sweeping across it, left lens first and the right one a moment later, once every 3 seconds.
// Here it is a CSS loop (styles.css, .cover-glint); the glasses' own SVG is not changed.

// The same glint works for the pink glasses (eyes/pink-glasses/pinkGlassesMotion.js): only the
// lens shapes and the streak position differ, so the glint is made by `makeLensGlint(drawing)`.

const NS = 'http://www.w3.org/2000/svg';
const GREEN = {
  shapes: 10,                                  // at least this many top-level shapes (else no glint)
  lens: { left: 3, right: 7 },                 // dark lens fills (top-level shapes of glasses.svg)
  before: { left: 5, right: 9 },               // the streak goes above its lens, under the frames
  streak: {                                    // the approved streak shape (glasses coordinates)
  right: ['M89.0306 17.2096L67.8646 45.6671L64.9145 38.0299L83.4741 13.0768L89.0306 17.2096Z', 'M70.1377 47.3578L91.3038 18.9003L94.082 20.9667L72.916 49.4242L70.1377 47.3578Z'],
  left: ['M34.135 20.0922L13.8269 47.3962L10.9964 40.0686L28.8037 16.1269L34.135 20.0922Z', 'M16.0079 49.0183L36.316 21.7144L38.9816 23.697L18.6735 51.001L16.0079 49.0183Z']
  }
};
// pink-glasses.svg — values from pinkGlassesMotion.js (SHAPES, LENS, GLINT_BEFORE, STREAK)
export const PINK_GLASSES_GLINT = {
  shapes: 14,
  lens: { left: 5, right: 2 },
  before: { left: 7, right: 4 },
  streak: {
    right: ['M94.2806 16.3296L73.1146 44.7871L70.1645 37.1499L88.7241 12.1968L94.2806 16.3296Z', 'M75.3877 46.4778L96.5538 18.0203L99.332 20.0867L78.166 48.5442L75.3877 46.4778Z'],
    left: ['M35.015 26.5322L14.7069 53.8362L11.8764 46.5086L29.6837 22.5669L35.015 26.5322Z', 'M16.8879 55.4583L37.196 28.1544L39.8616 30.137L19.5535 57.441L16.8879 55.4583Z']
  }
};
const COLOUR = '#F6FFE0';

// green glasses card cover (assets/covers/glasses-cover.svg, 110 × 58): the same drawing without the
// shadow group, so every shape is one place earlier; the stripes are moved onto its lens centres
export const GREEN_GLASSES_COVER_GLINT = {
  shapes: 14,
  lens: { left: 2, right: 6 },
  before: { left: 4, right: 8 },
  streak: GREEN.streak,
  shift: { left: [0, 2.4], right: [-0.1, 0.1] }
};

export const makeLensGlint = ({ shapes: minShapes, lens: LENS, before: GLINT_BEFORE, streak: STREAK, shift = {} }) => (svg, prefix) => {
  const shapes = [...svg.children].filter(el => el.tagName.toLowerCase() !== 'defs');
  if (shapes.length < minShapes) return;   // a different drawing: no glint
  const doc = svg.ownerDocument;
  const defs = doc.createElementNS(NS, 'defs');
  svg.insertBefore(defs, svg.firstChild);
  ['left', 'right'].forEach(side => {
    const clip = doc.createElementNS(NS, 'clipPath');
    clip.id = `${prefix}-glint-${side}`;
    const cp = doc.createElementNS(NS, 'path');
    cp.setAttribute('d', shapes[LENS[side]].getAttribute('d'));
    clip.appendChild(cp);
    defs.appendChild(clip);

    // direction across the stripes (left → right), as in the accessory
    const sp = STREAK[side][0].match(/-?\d+\.?\d*/g).map(Number);
    let ux = sp[2] - sp[0], uy = sp[3] - sp[1];
    const L = Math.hypot(ux, uy); ux /= L; uy /= L;
    let px = -uy, py = ux;
    if (px < 0) { px = -px; py = -py; }

    const holder = doc.createElementNS(NS, 'g');
    holder.setAttribute('clip-path', `url(#${clip.id})`);
    const band = doc.createElementNS(NS, 'g');
    band.setAttribute('class', `cover-glint cover-glint-${side}`);
    band.setAttribute('fill', COLOUR);
    band.setAttribute('style', `--px:${px.toFixed(4)};--py:${py.toFixed(4)}`);
    const stripes = doc.createElementNS(NS, 'g');
    if (shift[side]) stripes.setAttribute('transform', `translate(${shift[side][0]} ${shift[side][1]})`);
    STREAK[side].forEach(d => {
      const p = doc.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      stripes.appendChild(p);
    });
    band.appendChild(stripes);
    holder.appendChild(band);
    svg.insertBefore(holder, shapes[GLINT_BEFORE[side]]);
  });
};

// green glasses (the default export, as before)
export default makeLensGlint(GREEN);
