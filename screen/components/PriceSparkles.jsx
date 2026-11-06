import { memo } from 'react';

/**
 * Animated golden sparkles for a price pill (one reusable layer for every pill).
 *
 * The sparkles are the existing four-point sparkle shape and colour of the pill. Each one is born
 * at its spot on the pill, drifts outward (up from the upper half, down from the lower half, a
 * little sideways), twinkles — size and brightness flicker — and fades out, then starts again.
 * Every sparkle has its own speed, delay and twinkle rate, so they never move in step, and each
 * loop starts and ends invisible, so there are no jumps.
 *
 * Only CSS transform and opacity are animated (compositor-friendly); see styles.css, .spark.
 * The layer sits behind the star and the number, so the price stays readable.
 */

// Spawn points on the 54 × 30 pt pill: the original sparkle positions plus a few more.
// x — pt from the left edge (stretched with the pill), y — pt from the top, s — sparkle radius.
const SPAWN = [
  { x: 4.2, y: 16.5, s: 3.7 }, { x: 7.6, y: 18.2, s: 2.5 }, { x: 11, y: 11.5, s: 3 },
  { x: 11.8, y: 24, s: 3 }, { x: 17.7, y: 29.2, s: 2.5 }, { x: 26.1, y: 6.1, s: 4.2 },
  { x: 26.9, y: 22.4, s: 3 }, { x: 31.1, y: 23.3, s: 4.5 }, { x: 36.2, y: 27.5, s: 2.5 },
  { x: 37.3, y: 0.8, s: 2 }, { x: 40.5, y: 28, s: 2.5 }, { x: 42.2, y: 8.1, s: 4.2 },
  { x: 48, y: 13, s: 3.4 }, { x: 50, y: 22, s: 2.8 }, { x: 20, y: 3.5, s: 3 },
  { x: 46, y: 27, s: 2.6 }, { x: 33, y: 4.5, s: 2.8 }, { x: 2.5, y: 9, s: 2.4 }
];

// Small deterministic random generator: the same sparkles on every render.
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = v => Math.round(v * 100) / 100;

function makeSparks(seed) {
  const rnd = random(seed);
  return SPAWN.map(p => {
    const up = p.y < 15;
    const dur = 1.8 + rnd() * 1.6;                       // 1.8–3.4 s per flight
    return {
      left: `${r2((p.x / 54) * 100)}%`,
      top: r2(p.y),
      size: r2(p.s * 2),
      dx: r2((rnd() - 0.5) * 14),                          // ±7 pt sideways
      dy: r2((up ? -1 : 1) * (8 + rnd() * 13)),            // 8–21 pt outward
      o: r2(0.55 + rnd() * 0.45),                          // peak brightness
      dur: r2(dur),
      delay: r2(-rnd() * dur),                             // start mid-flight, out of step
      tw: r2(0.5 + rnd() * 0.6)                            // twinkle period 0.5–1.1 s
    };
  });
}

// Four-point sparkle in a 2 × 2 box (-1…1): also used by the profile sparkles (ProfileSparkles.jsx)
export const SPARK_SHAPE = 'M0 -1C.14 -.14 .14 -.14 1 0C.14 .14 .14 .14 0 1C-.14 .14 -.14 .14 -1 0C-.14 -.14 -.14 -.14 0 -1Z';

function PriceSparkles({ seed = 1, color = '#F4C04A' }) {
  const sparks = makeSparks(seed);
  return (
    <span className="price-sparkles" aria-hidden="true">
      {sparks.map((s, i) => (
        <span
          key={i}
          className="spark"
          style={{
            left: s.left, top: s.top, width: s.size, height: s.size,
            '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--o': s.o,
            animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s`
          }}
        >
          <svg viewBox="-1 -1 2 2" style={{ animationDuration: `${s.tw}s`, animationDelay: `${s.delay}s` }}>
            <path d={SPARK_SHAPE} fill={color} />
          </svg>
        </span>
      ))}
    </span>
  );
}

export default memo(PriceSparkles);
