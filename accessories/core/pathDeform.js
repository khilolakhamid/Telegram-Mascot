/**
 * Minimal SVG path tools for accessory secondary motion.
 *
 * The accessory's original path data is parsed once; every frame each point is passed through a
 * deformation function and the path is rebuilt with exactly the same commands. With an identity
 * deformation the result is the original shape (only number formatting differs).
 * Supports absolute M, L, H, V, C, S, Q, T, Z — what design tools export. Relative commands are
 * converted to absolute while parsing.
 */
const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

export function parsePath(d) {
  const out = [];
  let x = 0, y = 0, sx = 0, sy = 0;
  const re = /([MLHVCSQTZmlhvcsqtz])([^MLHVCSQTZmlhvcsqtz]*)/g;
  let m;
  while ((m = re.exec(d))) {
    const cmd = m[1], abs = cmd.toUpperCase(), rel = cmd !== abs;
    const n = (m[2].match(NUM) || []).map(Number);
    if (abs === 'Z') { out.push({ c: 'Z', p: [] }); x = sx; y = sy; continue; }
    const size = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2 }[abs];
    if (abs === 'A') throw new Error('pathDeform: arcs are not supported');
    for (let i = 0; i < n.length; i += size) {
      let a = n.slice(i, i + size), c = abs;
      if (abs === 'H') { a = [rel ? x + a[0] : a[0], y]; c = 'L'; }
      else if (abs === 'V') { a = [x, rel ? y + a[0] : a[0]]; c = 'L'; }
      else if (rel) a = a.map((v, k) => v + (k % 2 ? y : x));
      if (c === 'M' && i > 0) c = 'L';   // extra pairs after M are line-tos
      out.push({ c, p: a });
      x = a[a.length - 2]; y = a[a.length - 1];
      if (c === 'M') { sx = x; sy = y; }
    }
  }
  return out;
}

/** Rebuilds `d`; map(x, y) returns the new [x, y] for every point (end points and control points). */
export function buildPath(parsed, map) {
  let d = '';
  for (const s of parsed) {
    if (s.c === 'Z') { d += 'Z'; continue; }
    d += s.c;
    for (let i = 0; i < s.p.length; i += 2) {
      const [x, y] = map(s.p[i], s.p[i + 1]);
      d += (i ? ' ' : '') + (Math.round(x * 100) / 100) + ' ' + (Math.round(y * 100) / 100);
    }
  }
  return d;
}
