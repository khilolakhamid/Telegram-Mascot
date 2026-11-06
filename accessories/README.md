# accessories — wearable accessories for the dog

Accessories are standalone components. The dog (`../mascot`) is not modified and knows nothing about them:
an accessory is attached at runtime on top of the already rendered dog and removed without a trace.
Each accessory lives in its own folder and is imported on its own.

| Accessory | Folder | Component |
|---|---|---|
| Christmas hat | [`head/christmas-hat/`](head/christmas-hat/) | `ChristmasHat` |
| Bow | [`head/bow/`](head/bow/) | `Bow` |
| Duck | [`head/duck/`](head/duck/) | `Duck` |
| Cheese | [`head/cheese/`](head/cheese/) | `Cheese` |
| Glasses | [`eyes/glasses/`](eyes/glasses/) | `Glasses` |
| Pink glasses | [`eyes/pink-glasses/`](eyes/pink-glasses/) | `PinkGlasses` |
| Carrot in the mouth | [`mouth/carrot/`](mouth/carrot/) | `Carrot` |
| Ball in the mouth | [`mouth/ball/`](mouth/ball/) | `Ball` |
| Bone in the mouth | [`mouth/bone/`](mouth/bone/) | `Bone` |

## Usage

```tsx
import { DogMascot } from '../mascot/index.js';
import { ChristmasHat } from '../accessories/head/christmas-hat';

<ChristmasHat>
  <DogMascot size={240} />
</ChristmasHat>
```

To wear several accessories at once, nest them with `ChristmasHat` as the outermost wrapper
(`Duck`, `Cheese`, `Bow`, `Glasses`, `PinkGlasses`, `Carrot`, `Ball` and `Bone` can be nested in any order):

```tsx
import { Carrot } from '../accessories/mouth/carrot';

<ChristmasHat>
  <Carrot>
    <DogMascot size={240} />
  </Carrot>
</ChristmasHat>
```

See each accessory's README for its props, placement and motion.

## Try-on page

Requires Node.js 18 or newer.

```bash
cd accessories
npm install
npm run dev       # http://localhost:5173
```

The page has Play / Pause, a slider over the whole 12-second cycle, quick jumps
(head turn, crouch, pose 2, return), an on/off switch for each accessory,
backgrounds and sizes (240, 120, 64 px). The try-on canvas is larger than the dog's 240×240 frame:
36 units of room at the top, 20 at the sides and 8 at the bottom (`ROOM` in `demo/App.jsx`), so that
accessories above the head (the duck, the hat) stay fully visible through the whole cycle. The dog's
240×240 frame can be outlined with a dashed line.

## Files

```text
accessories/
├── head/                      head accessories
│   ├── christmas-hat/         Christmas hat (ChristmasHat.tsx, SVG, motion)
│   ├── bow/                   bow (Bow.tsx, SVG, motion)
│   ├── duck/                  duck (Duck.tsx, SVG, motion)
│   └── cheese/                cheese (Cheese.tsx, SVG, motion)
├── eyes/                      eye accessories
│   ├── glasses/               glasses (Glasses.tsx, SVG, motion)
│   └── pink-glasses/          pink glasses (PinkGlasses.tsx, SVG, motion)
├── mouth/                     mouth accessories
│   ├── carrot/                carrot (Carrot.tsx, SVG, motion)
│   ├── ball/                  ball (Ball.tsx, SVG, motion)
│   └── bone/                  bone (Bone.tsx, SVG, motion)
├── core/                      shared accessory engine
│   ├── headAccessory.js       attaches an SVG to the dog's head (above or below it) and makes it follow the head
│   ├── inertia.js             inertia (springs driven by the head's movement)
│   └── pathDeform.js          point-based deformation of SVG paths
├── tools/
│   └── fit_placement.py       measures placement from reference images
├── demo/                      try-on page (App.jsx, main.jsx, app.css)
├── index.html, index.js       try-on page and shared entry point
└── package.json, vite.config.js, tsconfig.json, vite-env.d.ts
```

## Adding a head accessory

Put it in `head/<name>/`, following `christmas-hat/`:

```js
import { createHeadAccessory } from '../../core/headAccessory.js';
import FLOWER_SVG from './assets/flower.svg?raw';

createHeadAccessory(svg, {
  name: 'flower', markup: FLOWER_SVG,
  placement: { scale: 1, pose1: { x, y, rotate }, pose2: { x, y, rotate } }
});
```

An accessory that must sit under the head and ears (like the mouth accessories) uses `layer: 'under-head'`.

If the accessory has a different size in the two reference poses, each pose can have its own `scale`
(as the bow does).

The `pose1` and `pose2` values come from `tools/fit_placement.py` (requires `rsvg-convert` and Python
with numpy, scipy and opencv-python). The last argument selects the colours to look for: `hat` (red and
grey-blue), `carrot` (orange and green), `bow` (pink), `ball` (yellow-green), `duck` (yellow and orange),
`glasses` (lime and green), `bone` (cream and dark brown), `cheese` (yellow and brown-orange) or
`pink-glasses` (light and dark pink). If the accessory covers the dog's eyes, the screenshot is aligned
with the dog by its outline and nose:

```bash
python3 accessories/tools/fit_placement.py flower.svg mascot/assets/dog-pose-1.svg reference-pose-1.png hat
```
