// Dog accessories shown in the "Dog" sheet.
// `Cover` — what the card shows (a picture of the accessory, card only).
// `accessory` — id of the real, wearable accessory from ../../accessories that a tap on the
// card puts on the dog (registered in components/WornDog.jsx, WEARABLES).
// `slot` — where it is worn: one item per slot at a time ('head', 'eyes', 'mouth', 'skin').
// `skin` — for skins: the dog model it turns the dog into (instead of `accessory`).
// `category` — tab it belongs to. Only entries that have both a cover and a registered wearable
// (or a skin) are shown; a new accessory gets its card by being added here.

import { createElement } from 'react';
// Card covers for the mouth accessories and the green glasses: separate cover files (the accessories' own SVGs are not used here)
import BALL_COVER_SVG from '../assets/covers/ball-cover.svg?raw';
import CARROT_COVER_SVG from '../assets/covers/carrot-cover.svg?raw';
import GLASSES_COVER_SVG from '../assets/covers/glasses-cover.svg?raw';
// Skin card covers: separate picture files (the skins' own models are not used on the cards)
import SKELETON_DOG_COVER_SVG from '../assets/covers/skeleton-dog-cover.svg?raw';
import UFO_DOG_COVER_SVG from '../assets/covers/ufo-dog-cover.svg?raw';
import ChristmasHatCover from '../components/ChristmasHatCover.jsx';
import AccessoryCover from '../components/AccessoryCover.jsx';
import { BOW_SVG } from '../../accessories/head/bow';
import { CHEESE_SVG } from '../../accessories/head/cheese';
import { DUCK_SVG } from '../../accessories/head/duck';
import { makeLensGlint, PINK_GLASSES_GLINT, GREEN_GLASSES_COVER_GLINT } from '../components/glassesCoverGlint.js';
import { PINK_GLASSES_SVG } from '../../accessories/eyes/pink-glasses';

// Shop tabs, in order. 'mine' — what the user owns: bought items and free ones (no price tags);
// 'all' — every item for sale; the others show the items for sale whose `category` matches.
// Free items (`free: true`) are not for sale, so they appear only in My Stuff.
export const ACCESSORY_CATEGORIES = [
  { id: 'mine', title: 'My Stuff' },
  { id: 'all', title: 'All Items' },
  { id: 'eyes', title: 'Eyes' },
  { id: 'head', title: 'Head' },
  { id: 'mouth', title: 'Mouth' },
  { id: 'skins', title: 'Skins' }
];
export const DEFAULT_CATEGORY = 'mine';   // the shop always opens on My Stuff

// Order of the All Items tab (ids); the items not listed follow in catalog order. After them come
// EMPTY_CARDS blank cards — visual placeholders only.
export const ALL_ITEMS_ORDER = ['bow', 'glasses', 'duck', 'carrot', 'cheese', 'skeleton-dog', 'pink-glasses', 'ufo-dog'];
export const EMPTY_CARDS = 3;

// Card covers from the accessories' own SVGs: which shapes move (see styles.css, .cover-*)
// carrot cover: which top-level shape is a leaf or the root, in the order of carrot-cover.svg
// (as in accessories/mouth/carrot/carrotMotion.js ROLES, the cover has one root shape fewer);
// a — leaves, b — root
const CARROT_ROLES = 'aabaaaaabbbbbbbbb';
const carrotParts = (el, b, i) => CARROT_ROLES[i] || 'b';
const bowParts = (el, b) => {                                              // a — left loop, b — right loop
  const cx = b.x + b.width / 2;
  if (b.width < 14 && Math.abs(cx - 40.85) < 8) return null;               // the knot stays still
  return cx < 40.85 ? 'a' : 'b';
};
const ballParts = () => 'a';                                               // the whole ball
const duckParts = el => (el.getAttribute('filter') ? null : 'a');          // the duck; its soft shadow stays
const cheeseParts = () => 'a';                                             // the whole cheese

const cover = (kind, markup, parts, decorate) => () => createElement(AccessoryCover, { kind, markup, parts, decorate });
const CarrotCover = cover('carrot', CARROT_COVER_SVG, carrotParts);
const BowCover = cover('bow', BOW_SVG, bowParts);
const BallCover = cover('ball', BALL_COVER_SVG, ballParts);
const DuckCover = cover('duck', DUCK_SVG, duckParts);
const CheeseCover = cover('cheese', CHEESE_SVG, cheeseParts);
const PinkGlassesCover = cover('pink-glasses', PINK_GLASSES_SVG, null, makeLensGlint(PINK_GLASSES_GLINT));   // same glint
const GlassesCover = cover('glasses', GLASSES_COVER_SVG, null, makeLensGlint(GREEN_GLASSES_COVER_GLINT));   // glint on the lenses
const SkeletonDogCover = cover('skeleton-dog', SKELETON_DOG_COVER_SVG, null);   // still picture, file 137 × 134
const UfoDogCover = cover('ufo-dog', UFO_DOG_COVER_SVG, null);                  // still picture, file 137 × 145

export const ACCESSORIES = [
  // the only free item: owned by everyone from the start, shown only in My Stuff, no price tag
  { id: 'christmas-hat', price: 0, free: true, slot: 'head', category: 'head', Cover: ChristmasHatCover, accessory: 'christmas-hat' },
  { id: 'carrot', price: 50, slot: 'mouth', category: 'mouth', Cover: CarrotCover, accessory: 'carrot' },
  { id: 'bow', price: 50, slot: 'head', category: 'head', Cover: BowCover, accessory: 'bow' },
  { id: 'ball', price: 50, slot: 'mouth', category: 'mouth', Cover: BallCover, accessory: 'ball' },
  { id: 'duck', price: 50, slot: 'head', category: 'head', Cover: DuckCover, accessory: 'duck' },
  { id: 'glasses', price: 50, slot: 'eyes', category: 'eyes', Cover: GlassesCover, accessory: 'glasses' },
  { id: 'cheese', price: 50, slot: 'head', category: 'head', Cover: CheeseCover, accessory: 'cheese' },
  { id: 'pink-glasses', price: 50, slot: 'eyes', category: 'eyes', Cover: PinkGlassesCover, accessory: 'pink-glasses' },
  // Skins: a whole new model of the dog (`skin` — id in ../../mascot/variants); one at a time.
  // No skin selected = the free default Original Dog.
  { id: 'skeleton-dog', price: 1000, slot: 'skin', category: 'skins', Cover: SkeletonDogCover, skin: 'skeleton' },
  { id: 'ufo-dog', price: 1000, slot: 'skin', category: 'skins', Cover: UfoDogCover, skin: 'ufo' }
];

export const SLOTS = ['head', 'eyes', 'mouth', 'skin'];

// Starting star balance (the current balance lives in state/dogStore.jsx and is saved locally)
export const INITIAL_STAR_BALANCE = 3000;
