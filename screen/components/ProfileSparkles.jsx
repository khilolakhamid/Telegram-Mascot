import { SPARK_SHAPE, random } from './PriceSparkles.jsx';

/**
 * White sparkles around a gift in the profile header — the same four-point sparkle as on the
 * price pills (PriceSparkles), drawn as soft white light like in the reference video. A ring of
 * sparkles of different sizes sits around the gift; each one floats very slowly up and down on its
 * own and gently fades in and out (twinkles), out of step with the others and with the gift.
 * Only transform and opacity animate (styles.css, .profile-spark).
 */
function makeSparks(seed, size, count) {
  const rnd = random(seed);
  const r2 = v => Math.round(v * 100) / 100;
  return Array.from({ length: count }, (_, i) => {
    const angle = ((i + rnd() * 0.6) / count) * Math.PI * 2;
    const dist = size * (0.45 + rnd() * 0.5);                 // 0.45–0.95 of the gift size from its centre
    const s = 2.4 + rnd() * 2.8;                              // sparkle radius 2.4–5.2 pt
    const floatDur = 2.6 + rnd() * 1.6;                       // half a float: 2.6–4.2 s
    const twDur = 1.6 + rnd() * 1.8;                          // half a twinkle: 1.6–3.4 s
    return {
      x: r2(Math.cos(angle) * dist), y: r2(Math.sin(angle) * dist * 0.85), size: r2(s * 2),
      o: r2(0.7 + rnd() * 0.3),
      float: r2(floatDur), floatDelay: r2(-rnd() * floatDur * 2),
      tw: r2(twDur), twDelay: r2(-rnd() * twDur * 2)
    };
  });
}

export default function ProfileSparkles({ x, y, size, seed = 1, count = 8 }) {
  const sparks = makeSparks(seed, size, count);
  return (
    <span
      className="profile-sparkles"
      aria-hidden="true"
      style={{ left: `${(x / 402) * 100}%`, top: `${(y / 871) * 100}%` }}   // the gift's centre
    >
      {sparks.map((s, i) => (
        <span key={i} className="profile-spark"
          style={{ left: s.x, top: s.y, width: s.size, height: s.size, '--o': s.o,
            animationDuration: `${s.float}s`, animationDelay: `${s.floatDelay}s` }}>
          <svg viewBox="-1 -1 2 2" style={{ animationDuration: `${s.tw}s`, animationDelay: `${s.twDelay}s` }}>
            <path d={SPARK_SHAPE} fill="#FFFFFF" />
          </svg>
        </span>
      ))}
    </span>
  );
}
