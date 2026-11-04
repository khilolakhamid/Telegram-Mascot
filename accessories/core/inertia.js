/**
 * Fabric inertia for accessories — deterministic and seekable.
 *
 * The head's motion over the whole 12-second sequence is known in advance (pose morph + head turn),
 * so the accessory's springy lag is simulated once, offline, as damped springs driven by the head's
 * acceleration, block by block (see below). Seek, pause and scrubbing always show the same frame for
 * the same time, and nothing depends on the frame rate.
 *
 *   const lag = buildInertia({ placementAt, duration: 12, anchor: [x, y], springs: {...} });
 *   lag(time) → { x, y, <spring name>: angle (rad), … }
 *
 *   placementAt(time) → accessory→dog matrix [a b c d e f] (no secondary motion)
 *   anchor            point (accessory units) whose acceleration drives the translation spring
 *   translation       { omega, zeta }  spring of the relative offset (returned in accessory units)
 *   segment, settle   block length (s) and the time (s) at a block's end in which leftover motion settles
 *   springs           { name: { omega, zeta, axis: [x, y], length } } angular springs (rad):
 *                     driven by the head's angular acceleration and by the anchor's acceleration
 *                     across `axis` (the rest direction of that piece, accessory units) / `length`.
 */
export function buildInertia({ placementAt, duration, anchor, translation, springs, segment = duration, settle = 0.35, rate = 240 }) {
  const N = Math.round(duration * rate), dt = 1 / rate;

  // Drive signals sampled over one loop (periodic): anchor position and accessory angle, dog frame
  const px = new Float64Array(N), py = new Float64Array(N), th = new Float64Array(N), R = [];
  for (let i = 0; i < N; i++) {
    const m = placementAt(i * dt);
    px[i] = m[0] * anchor[0] + m[2] * anchor[1] + m[4];
    py[i] = m[1] * anchor[0] + m[3] * anchor[1] + m[5];
    th[i] = Math.atan2(m[1], m[0]);
    const s = Math.hypot(m[0], m[1]);
    R.push([m[0] / s, m[1] / s]);   // rotation part (cos, sin)
  }
  const idx = i => ((i % N) + N) % N;
  const unwrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  // Accelerations (central differences), turned into the accessory's own frame
  const ax = new Float64Array(N), ay = new Float64Array(N), al = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const a = idx(i - 1), b = idx(i + 1);
    const gx = (px[b] - 2 * px[i] + px[a]) / (dt * dt), gy = (py[b] - 2 * py[i] + py[a]) / (dt * dt);
    const [c, s] = R[i];
    ax[i] = c * gx + s * gy; ay[i] = -s * gx + c * gy;
    al[i] = (unwrap(th[b] - th[i]) - unwrap(th[i] - th[a])) / (dt * dt);
  }

  const names = Object.keys(springs);
  const out = { x: new Float32Array(N), y: new Float32Array(N) };
  names.forEach(n => (out[n] = new Float32Array(N)));

  // Each block (`segment` seconds) is simulated on its own, starting at rest — every block starts and
  // ends with the head at rest — and any motion left at the block's end is eased out over the last
  // `settle` seconds (value and speed both reach 0). So every block begins and ends with the
  // accessory exactly at its rest shape: blocks join seamlessly in any order and can be exported
  // one by one (Telegram TGS).
  const sub = 4, h = dt / sub, seg = Math.round(segment * rate), tail = Math.round(settle * rate);
  for (let s0 = 0; s0 < N; s0 += seg) {
    const s1 = Math.min(N, s0 + seg);
    let tx = 0, ty = 0, tvx = 0, tvy = 0;
    const st = names.map(() => ({ a: 0, v: 0 }));
    const vel = { x: 0, y: 0 }; names.forEach(n => (vel[n] = 0));
    for (let i = s0; i < s1; i++) {
      for (let k = 0; k < sub; k++) {
        const { omega: w, zeta: z } = translation;
        tvx += h * (-w * w * tx - 2 * z * w * tvx - ax[i]); tx += h * tvx;
        tvy += h * (-w * w * ty - 2 * z * w * tvy - ay[i]); ty += h * tvy;
        names.forEach((n, j) => {
          const sp = springs[n], q = st[j];
          // acceleration across the piece (clockwise-perpendicular to its axis) swings it the other way
          const L = Math.hypot(sp.axis[0], sp.axis[1]), cx = -sp.axis[1] / L, cy = sp.axis[0] / L;
          const drive = -al[i] - (ax[i] * cx + ay[i] * cy) / sp.length;
          q.v += h * (-sp.omega * sp.omega * q.a - 2 * sp.zeta * sp.omega * q.v + drive); q.a += h * q.v;
        });
      }
      out.x[i] = tx; out.y[i] = ty; vel.x = tvx; vel.y = tvy;
      names.forEach((n, j) => { out[n][i] = st[j].a; vel[n] = st[j].v; });
    }
    // ease out what is left: subtract  w(t)·(x_end + v_end·(t − t_end)),  w = smoothstep over the tail
    const iEnd = s1 - 1, tEnd = iEnd * dt;
    for (const key of ['x', 'y', ...names]) {
      const xe = out[key][iEnd], ve = vel[key];
      for (let i = Math.max(s0, s1 - tail); i < s1; i++) {
        const u = (i - (s1 - tail)) / (tail - 1), w = u * u * (3 - 2 * u);
        out[key][i] -= w * (xe + ve * (i * dt - tEnd));
      }
    }
  }

  return time => {
    const f = (((time % duration) + duration) % duration) * rate, i = Math.floor(f), u = f - i, j = (i + 1) % N;
    const r = { x: out.x[i] + (out.x[j] - out.x[i]) * u, y: out.y[i] + (out.y[j] - out.y[i]) * u };
    names.forEach(n => (r[n] = out[n][i] + (out[n][j] - out[n][i]) * u));
    return r;
  };
}
