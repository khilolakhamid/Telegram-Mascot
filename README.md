# Telegram Mascot

An animated dog mascot for Telegram, with wearable accessories, alternative skins and a Telegram-style
profile screen that includes the **Dog** accessories shop.

Everything is drawn as vector SVG and animated in code: no GIFs, videos or raster frames.
The animation is built in 3-second blocks to fit Telegram's animated sticker (TGS) limits.

## Features

- **Animated dog.** A 12-second looping sequence: breathing, ears, tail, blinking and a head turn
  in the first pose, then a playful crouch and return. React component and a framework-agnostic engine.
- **Accessories.** Christmas hat, bow, duck, cheese, glasses, pink glasses, carrot, ball and bone.
  Each one follows the head frame by frame and has its own secondary motion (springs, sway, lens glint),
  without modifying the dog.
- **Skins.** Skeleton Dog and UFO Dog: complete alternative models with the same behaviour and timing.
- **Profile screen and Dog shop.** A Telegram profile screen reproduced from Figma in an interactive
  iPhone preview. The shop has categories, try-on, star purchases, My Stuff, Apply Style, pins,
  saved state and one continuous animation timeline across screens.

## Repository structure

```text
Telegram-Mascot/
├── mascot/              the animated dog: source SVGs, animation engine, React component, demo
│   └── variants/        skins: Skeleton Dog and UFO Dog
├── accessories/         wearable accessories (head, eyes, mouth), shared engine, try-on page
└── screen/              Telegram profile screen with the Dog shop, iPhone preview
```

| Folder | Contents | Documentation |
|---|---|---|
| `mascot/` | the dog component (`DogMascot`) and its engine (`createDogAnimation`) | [`mascot/README.md`](mascot/README.md) |
| `mascot/variants/` | skins: `SkeletonDog`, `UFODog` and the `SKINS` registry | [Skeleton Dog](mascot/variants/skeleton/README.md), [UFO Dog](mascot/variants/ufo/README.md) |
| `accessories/` | accessory components and the try-on page | [`accessories/README.md`](accessories/README.md) |
| `screen/` | the profile screen, the Dog shop and the preview build | [`screen/README.md`](screen/README.md) |

## Getting started

Requirements: Node.js 18 or newer. Python 3 with numpy is needed only to rebuild the morph data
after changing the source SVGs.

### Dog demo

```bash
cd mascot
npm install
npm run dev        # http://localhost:5173
```

Skin comparison pages are available at `/variants/skeleton/demo/` and `/variants/ufo/demo/`
on the same dev server.

### Accessories try-on page

```bash
cd accessories
npm install
npm run dev        # http://localhost:5173
```

### Profile screen and Dog shop

```bash
npm install -g typescript              # used only to compile JSX/TSX
node screen/tools/build-preview.mjs    # → screen/dist/preview.html
```

Open `screen/dist/preview.html` in a browser.

## Usage

```jsx
import { DogMascot } from './mascot/index.js';
import { ChristmasHat } from './accessories/head/christmas-hat';
import { Carrot } from './accessories/mouth/carrot';

<ChristmasHat>
  <Carrot>
    <DogMascot size={240} />
  </Carrot>
</ChristmasHat>
```

Skins are swapped through the registry:

```jsx
import { SKINS } from './mascot/variants/index.js';

const { Component } = SKINS.ufo;   // 'original' | 'skeleton' | 'ufo'
<Component size={240} />
```

## Branches

| Branch | Contents |
|---|---|
| `main` | the complete project |
| `screen` | the profile screen and the Dog shop, with the dog, accessories and skins |
| `accessories` | the dog and the accessories |
| `skins` | the dog and the skins |
