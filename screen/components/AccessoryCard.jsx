import StarIcon from './StarIcon.jsx';
import PriceSparkles from './PriceSparkles.jsx';

// Pin icon (assets/icons/pin.svg, 17 × 17): the same shape, drawn in light grey for the white cards
// (the file's blend modes are meant for coloured backgrounds). Shown on the card of what the dog
// wears — a worn accessory or the active skin.
const PIN_PATH = 'M14.5451 7.87526L14.9771 7.56034C15.8369 6.94667 16.043 5.74354 15.4407 4.86744L14.3312 3.2525C13.7289 2.3764 12.548 2.16646 11.6881 2.78014L11.2523 3.09909V3.10312L9.03719 4.72613L4.80518 4.0842C4.57932 4.04382 4.33364 4.11649 4.13551 4.2578C3.67189 4.58886 3.57283 5.16216 3.89775 5.63453L6.25944 9.09857C3.6283 11.2303 2.12649 12.6433 1.861 13.2288C1.81345 13.3337 1.80949 13.4145 1.84515 13.467C1.88874 13.5356 1.99573 13.5558 2.15819 13.5275C2.80409 13.4226 4.36534 12.5788 6.90533 11.0082L7.35707 10.7095L9.76234 14.2381C9.90103 14.44 10.1388 14.5449 10.3567 14.5651C10.9075 14.6216 11.3751 14.2946 11.4662 13.7778L12.3221 9.5023L14.5451 7.87526Z';
const Pin = () => (
  <svg className="card-pin" viewBox="0 0 17 17" aria-hidden="true">
    <path d={PIN_PATH} fillRule="evenodd" clipRule="evenodd" />
  </svg>
);

// Price pill: animated sparkles behind the Telegram star and the price.
export function PricePill({ price, seed }) {
  return (
    <div className="price-pill">
      <PriceSparkles seed={seed} />
      <StarIcon size={16} className="price-star" />
      <span className="price-value">{price}</span>
    </div>
  );
}

// A stable number per card, so each pill's sparkles move differently.
const seedOf = id => [...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// One accessory card: white, 3 per row — the accessory's cover above, the price pill below.
// A card with a wearable accessory is selectable (works the same for every accessory):
// selected → golden outline, the white block shrinks slightly inside it, the accessory is put on
// the dog and the Buy button appears; tap again → back to normal. The card's outer size is fixed.
// `pinned` — the dog wears it (saved); `square` — the 1 : 1 card of My Stuff (same width, no price).
export default function AccessoryCard({ item, selected = false, onToggle, showPrice = true, pinned = false, square = false }) {
  const { Cover, price, accessory, skin } = item;
  const pressable = Boolean((accessory || skin) && onToggle);
  const toggle = () => onToggle(item);
  return (
    <div
      className={`accessory-card${pressable ? ' is-pressable' : ''}${selected ? ' is-selected' : ''}${square ? ' is-square' : ''}`}
      aria-label={(showPrice ? `Accessory, ${price} stars` : 'Accessory') + (pinned ? ', worn' : '')}
      {...(pressable ? {
        role: 'button', tabIndex: 0, 'aria-pressed': selected, onClick: toggle,
        onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }
      } : {})}
    >
      <div className="accessory-card-bg" aria-hidden="true" />
      <div className="accessory-slot">{Cover ? <Cover /> : null}</div>
      {pinned && <Pin />}
      {showPrice && <PricePill price={price} seed={seedOf(item.id)} />}
    </div>
  );
}
