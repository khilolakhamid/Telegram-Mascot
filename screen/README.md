# screen — Telegram profile screen with the Dog shop

A Telegram profile screen reproduced from Figma (402 × 871 pt, iPhone 16 Pro) with the animated dog
next to the avatar and the **Dog** accessories shop. Everything runs inside an interactive iPhone preview.
The dog comes from `../mascot`, the wearable accessories from `../accessories` and the skins from
`../mascot/variants`. All of them are used as they are, without modifications.

## Building the preview

Requires Node.js 18+ and TypeScript (used only to compile JSX/TSX; a global `npm i -g typescript`
or a local install).

```bash
node screen/tools/build-preview.mjs   # → screen/dist/preview.html
```

The result is a single self-contained HTML page; open it in any browser. React 18.3.1 is loaded
from cdnjs. Options:

```bash
node screen/tools/build-preview.mjs --out my-preview.html          # custom output path
node screen/tools/build-preview.mjs --react-bundle react-local.js  # offline: inline a script that sets window.React / window.ReactDOM
```

## Features

### Profile screen

- Vector elements of the Figma screen (`assets/profileScreen.json`), Glass buttons, status bar.
- The dog sits at the bottom-right edge of the avatar: a 64 × 64 pt box at (216.2, 129.8)
  in screen coordinates (`MASCOT_BOX` in `components/ProfileScreen.jsx`). It wears the saved style.
- Gifts in the profile header: pink and blue bells (`assets/profile-gifts/`) float very slowly up
  and down (±1.3 pt, full cycles of 6.4 s and 7.2 s, out of step), each surrounded by a ring of
  8 white sparkles that drift and twinkle (`ProfileSparkles`).

### Dog shop

- Opens when the dog is tapped (slides up while the profile recedes, as in iOS) and closes with the X button.
- Header: the dog wearing the current try-on, the title "Dog", the description and the star balance.
- Categories in a horizontally scrolling tab row: **My Stuff** (owned items, no price tags),
  **All Items**, **Eyes**, **Head**, **Mouth**, **Skins** (`ACCESSORY_CATEGORIES` in `data/accessories.js`).
  The shop always opens on My Stuff.
- All Items order: bow, green glasses, duck, carrot, cheese, Skeleton Dog, pink glasses, UFO Dog,
  then the remaining items, followed by 3 empty placeholder cards (`ALL_ITEMS_ORDER`, `EMPTY_CARDS`).
- Items: Christmas hat (free, owned by everyone, shown only in My Stuff), carrot, bow, ball, duck,
  glasses, cheese, pink glasses (50 ★ each), Skeleton Dog and UFO Dog skins (1000 ★ each).
  The bone accessory is not sold in the shop; its component remains in `../accessories/mouth/bone`.
- Card covers are separate files in `assets/covers/` (or the Christmas hat's own animated cover);
  the dog always wears the real components from `../accessories`.

### Selection, purchase and Apply Style

- **Try-on.** Tapping a card outlines it in gold and puts the item on the dog in the shop.
  Tapping it again removes it.
- **One item per slot** (head, eyes, mouth, skin). Picking another item for the same slot replaces
  the previous pick: its outline, its price in the total and its try-on go away.
  Items in different slots combine and their prices add up.
- **Skins and accessories never mix.** Picking a skin drops the picked accessories; picking an accessory
  drops the skin and brings back the original dog. Removing a skin brings back the saved accessories;
  removing the last accessory brings back the saved skin.
- **Buy.** The bottom button shows "Buy for ★ total" for the unbought items in the selection. Buying charges
  the total once, and the items appear in My Stuff. With too few stars, the button looks normal but does nothing.
- **Apply Style.** For owned items the button reads "Apply Style": it saves the look being tried on and
  closes the shop. Closing with X does not save the try-on.
- **Pin.** A light-grey pin (`assets/icons/pin.svg`) marks the cards of what the dog wears (accessories or
  the active skin). It moves only after Apply Style. In My Stuff the cards are square (1 : 1).

### State and persistence

- Starting balance: 3000 ★. Purchases, balance and the worn style are saved (`state/dogStore.jsx`):
  in the page's database when it runs as a claude.ai artifact, and in `localStorage` everywhere.
- **Restart** below the iPhone frame resets everything: balance, purchases, worn items and skin.
  `?reset` in the URL does the same on load, and `?reset&stars=5000` sets a test balance.

### Continuous animation

`state/mascotClock.js` provides one shared timeline for the dog in the profile and the dog in the shop.
The clock starts once, when the page loads, and is never reset. A dog that appears (a new skin, the shop
opening) starts at the current moment (`startTime={mascotTime()}`), and running dogs are aligned to the
clock together twice a second. Accessories are toggled through `enabled`, without re-creating the dog,
so they pick up its current phase. Animation speeds and timings are unchanged.

## Files

```text
screen/
├── assets/
│   ├── profileScreen.json        vector elements of the Figma screen
│   ├── covers/                   card covers (ball, carrot, bone, glasses, Christmas hat, Skeleton Dog, UFO Dog)
│   ├── icons/                    pin.svg, type-star.svg
│   └── profile-gifts/            bells-pink.svg, bells-blue.svg
├── components/
│   ├── IPhonePreview.jsx         iPhone frame and the preview panel (Restart); full width on narrow screens
│   ├── PhoneScreen.jsx           everything inside the iPhone: profile, Dog shop, status bar
│   ├── ProfileScreen.jsx         profile screen: sections, Glass buttons, the dog (MASCOT_BOX), status bar
│   ├── ProfileGifts.jsx          gifts in the profile header (bells)
│   ├── ProfileSparkles.jsx       white sparkles around the gifts
│   ├── AccessoriesSheet.jsx      the Dog shop: dog, balance, tabs, grid, selection logic
│   ├── AccessoryCard.jsx         a shop card: cover, price pill, outline, pin
│   ├── AccessoryCover.jsx        card covers built from SVG files, with light cover animations
│   ├── ChristmasHatCover.jsx     the Christmas hat cover (own SVG, soft animation)
│   ├── glassesCoverGlint.js      lens glint for the glasses covers
│   ├── SkinCover.jsx             open-shop context used by the covers
│   ├── PriceSparkles.jsx         animated sparkles on the price pills
│   ├── BuyButton.jsx             "Buy for ★ price" / "Apply Style" button
│   ├── StarIcon.jsx              Telegram Star icon
│   └── WornDog.jsx               the dog with its worn accessories (WEARABLES registry)
├── data/
│   ├── accessories.js            categories, catalogue, prices, covers, item order, starting balance
│   └── skins.js                  dog models from ../mascot/variants (Original, Skeleton, UFO)
├── state/
│   ├── dogStore.jsx              balance, owned items, worn style, persistence
│   └── mascotClock.js            shared animation timeline
├── tools/build-preview.mjs       builds dist/preview.html
├── main.jsx                      entry point
└── styles.css
```
