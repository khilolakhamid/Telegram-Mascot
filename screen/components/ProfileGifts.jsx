import BELLS_PINK from '../assets/profile-gifts/bells-pink.svg?raw';
import BELLS_BLUE from '../assets/profile-gifts/bells-blue.svg?raw';
import ProfileSparkles from './ProfileSparkles.jsx';

// Gift objects in the profile header: the original SVG files (unchanged), placed as in the design
// and floating very slowly up and down — each at its own pace, so they never move in step
// (`duration` is half a cycle: down, then back up — a full float takes 6.4 s and 7.2 s).
// Positions are in screen points (402 × 871) and set in %, so they stay in place at any screen size.
const toSrc = svg => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export const PROFILE_GIFTS = [
  { id: 'bells-pink', svg: BELLS_PINK, x: 89.45, y: 160.2, size: 28, duration: 3.2, delay: -0.9 },
  { id: 'bells-blue', svg: BELLS_BLUE, x: 274.75, y: 88.8, size: 28, duration: 3.6, delay: -2.1 }
];

// Sparkles around each gift (a separate layer with its own slow motion, see ProfileSparkles.jsx)
const SPARKLE_SEEDS = { 'bells-pink': 11, 'bells-blue': 23 };

export default function ProfileGifts() {
  return PROFILE_GIFTS.flatMap(g => [
    <ProfileSparkles key={`${g.id}-sparkles`} x={g.x + g.size / 2} y={g.y + g.size / 2} size={g.size} seed={SPARKLE_SEEDS[g.id]} />,
    <img
      key={g.id}
      className="profile-gift"
      src={toSrc(g.svg)}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{
        left: `${(g.x / 402) * 100}%`,
        top: `${(g.y / 871) * 100}%`,
        width: `${(g.size / 402) * 100}%`,
        animationDuration: `${g.duration}s`,
        animationDelay: `${g.delay}s`
      }}
    />
  ]);
}
