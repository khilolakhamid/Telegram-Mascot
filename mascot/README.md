# mascot — the animated dog

A standalone component: the dog is drawn from its source SVGs and animated in code
(SVG + JavaScript, no GIFs, videos or raster frames).

## Running the demo

Requires Node.js 18 or newer.

```bash
cd mascot
npm install
npm run dev       # demo: http://localhost:5173
npm run build     # build into mascot/dist/
```

The demo page has Play and Pause buttons, the time within the 12-second sequence,
a slider to jump to any moment and a size switch (240, 120 and 64 px).

## Files

```text
mascot/
├── assets/
│   ├── dog-pose-1.svg        first pose (source)
│   └── dog-pose-2.svg        second, playful lying pose (source)
├── animations/
│   ├── dogAnimation.js       engine: SVG assembly, all movements, the 12-second sequence
│   ├── poseMorph.js          outline morphing between the poses
│   └── dogMorphData.json     matched outlines of the two poses (generated)
├── components/
│   └── DogMascot.jsx         React component
├── variants/                 skins: Skeleton Dog and UFO Dog (see variants/*/README.md)
├── tools/
│   └── build_morph_data.py   rebuilds dogMorphData.json from the SVGs (Python 3 + numpy)
├── demo/                     demo page (App.jsx, main.jsx, app.css)
├── index.html                demo page entry
├── index.js                  public component entry
├── package.json              dependencies: react, react-dom; vite for the demo
└── vite.config.js
```

## Usage

```jsx
import { DogMascot } from '../mascot/index.js';   // path from your folder

<DogMascot />                 // 240 × 240, endless loop
<DogMascot size={120} />      // proportionally smaller, lines included
<DogMascot playing={false} /> // paused
```

A `ref` exposes `play()`, `pause()`, `seek(seconds)`, `isPlaying()`, `getTime()` and `duration`.
The `onFrame({ time, blockIndex, block, stage, pose })` callback runs on every frame.

Without React, the engine attaches to any `<svg>`:

```js
import { createDogAnimation } from '../mascot/index.js';
const dog = createDogAnimation(document.querySelector('svg'), { autoPlay: true });
dog.pause(); dog.play(); dog.seek(9.5); dog.destroy();
```

The component does not depend on the page or the player. Several dogs can live on one page:
each one has its own gradient and mask ids.

## Behaviour

The sequence lasts 12 seconds and repeats forever. It is built from two animation blocks,
each exactly 3 seconds long (the Telegram TGS limit):

| Time | Block | What happens |
|---|---|---|
| 0–3 s | pose 1 | breathing, ears, tail, blinking, head turn to the left and back |
| 3–6 s | pose 1 | the same |
| 6–9 s | pose 1 | the same |
| 9–12 s | play pose | 0.5 s crouch → 2 s in the second pose → 0.5 s return |

Every periodic movement fits a whole number of oscillations into 3 seconds, so the blocks join
without jerks.

Details of the motion:

- on a pose change the front legs rotate as a whole at the shoulder; their lines stay
  complete and solid through the entire transition;
- the shadow under the head is cast by the head: it follows the head turn and the pose change
  and is clipped by the body silhouette;
- blinking with different shapes of the closed eyes;
- a soft ground shadow (a black ellipse with a radial gradient, up to 28% opacity): it adapts to
  the position of the paws on every frame, widens on the crouch and narrows on the return.
  The component's background is transparent;
- a springy settle after the crouch and a livelier tail in the second pose.

Speed, amplitudes, stage timings and block order are set in `DOG_ANIMATION_CONFIG`
(`animations/dogAnimation.js`).

## TGS compatibility

Only rotation, scale, translation, path animation, linear and radial gradients and two masks
(Alpha Matte) are used: the shadow is clipped by the body silhouette, and the inner nose outline
by the shape of the nose. There are no expressions, effects, raster images, text, 3D or dashed lines.
Each 3-second block can be exported as its own TGS file.

## Rebuilding the morph data

Only needed after changing the SVGs in `assets/`:

```bash
python3 mascot/tools/build_morph_data.py
```
