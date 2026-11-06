import { useLayoutEffect, useRef } from 'react';

let coverCount = 0;

/**
 * Card cover made from an accessory's own SVG (the original markup, unchanged), with a light loop
 * in the character of the accessory's motion. `parts(el, box, index)` names the moving piece a top-level
 * shape belongs to ('a', 'b' or nothing = still); each piece gets the class `cover-part-<name>`
 * and the cover gets `cover-<kind>` — the movement itself is CSS (styles.css, .cover-*).
 * Ids inside the SVG get a unique prefix, so the cover never clashes with the accessory on the dog.
 * `decorate(svg, prefix)` may add cover-only layers (the glasses' lens glint).
 */
export default function AccessoryCover({ kind, markup, parts, decorate }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const host = ref.current;
    host.innerHTML = markup;
    const svg = host.querySelector('svg');
    if (!svg) return;
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('aria-hidden', 'true');

    // unique ids (gradients) and references to them
    const prefix = `cover-${kind}-${++coverCount}`;
    const map = {};
    svg.querySelectorAll('[id]').forEach(el => { map[el.id] = `${prefix}-${el.id}`; el.id = map[el.id]; });
    svg.querySelectorAll('*').forEach(el => {
      for (const a of ['fill', 'stroke', 'clip-path', 'mask', 'filter']) {
        const v = el.getAttribute(a);
        if (v && v.includes('url(#')) el.setAttribute(a, v.replace(/url\(#([^)]+)\)/g, (m, id) => (map[id] ? `url(#${map[id]})` : m)));
      }
      for (const a of ['href', 'xlink:href']) {
        const v = el.getAttribute(a);
        if (v && v[0] === '#' && map[v.slice(1)]) el.setAttribute(a, '#' + map[v.slice(1)]);
      }
    });

    // extra layers drawn for the cover only (e.g. the glasses' glint), before grouping
    if (decorate) decorate(svg, prefix);

    // group consecutive shapes of the same moving piece (layer order stays as designed)
    const shapes = [...svg.children].filter(el => el.tagName.toLowerCase() !== 'defs');
    let group = null, groupName = null;
    shapes.forEach((el, index) => {
      let name = null;
      try { name = parts ? parts(el, el.getBBox(), index) : null; } catch { name = null; }
      if (!name) { group = null; groupName = null; return; }
      if (!group || groupName !== name) {
        group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `cover-part-${name}`);
        el.before(group);
        groupName = name;
      }
      group.appendChild(el);
    });
  }, [kind, markup, parts, decorate]);

  return <span ref={ref} className={`accessory-cover cover-${kind}`} aria-hidden="true" />;
}
