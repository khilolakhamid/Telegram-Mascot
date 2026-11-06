# UFO Dog — alien mascot skin

A standalone model of the dog: its own SVGs, its own layer structure, its own morph data and its
own rendering engine. The behaviour (the 12-second sequence, timing, amplitudes, body-part
movements) is shared with the Original Dog and the Skeleton Dog: the behaviour settings and
body-part trajectories are read from the original component, read-only.

## Files

```text
variants/ufo/
├── assets/                  ufo-pose-1.svg, ufo-pose-2.svg (sources)
├── animations/
│   ├── ufoAnimation.js      skin engine (createUFOAnimation), antenna physics
│   ├── ufoMorph.js          morphing of outlines and gradients, antenna bending
│   └── ufoMorphData.json
├── components/UFODog.jsx
├── tools/build_ufo_data.py
├── demo/                    Original vs UFO on a shared timer
└── index.js
```

## Usage

```jsx
import { UFODog } from './mascot/variants/ufo/index.js';
<UFODog size={240} />
```

Props and methods are the same as on `DogMascot` and `SkeletonDog`. Through the registry:
`SKINS.ufo` in `mascot/variants/index.js`.

To compare: `cd mascot && npm run dev`, then open `http://localhost:5173/variants/ufo/demo/`.

## Antennas

Each antenna is part of the head, anchored at the base of its stalk. The base moves only
with the head. The stalk bends in an arc, more towards the tip, and the ball turns together
with the tip.

The antenna angle is the sum of three parts:

1. **Sway**: slow, one oscillation per 3-second block; the right antenna is phase-shifted.
2. **Breathing**: on the inhale the antennas spread slightly outwards.
3. **Inertia**: the response of a damped spring (2.4 Hz, damping 0.2) to the head's angular
   acceleration and the acceleration of the antenna base. So the antennas lag behind on the head
   turn, swing harder on the crouch and the return, and settle over a few oscillations.
   The amplitude is softly limited to 12°.

The response is computed from the sequence time only, with no accumulated state.
So the motion is identical when playing, seeking, slowing down and across loop boundaries.
All parameters are in `ANTENNA_CONFIG` (`animations/ufoAnimation.js`).

## Bounds

In the middle of the crouch and the return, the antenna balls rise about 11 units above the top
edge of the 240×240 box. The component draws them outside its frame (`overflow: visible`), so
a layout needs a little room above it. For a TGS export (512×512) the composition has to be scaled
down or moved down slightly.

## TGS

The antenna oscillations after the return continue into the start of the next pose-1 block.
So the first block after the play pose differs from the following two, and a TGS export needs
a separate version of that block.

## Rebuilding the data

```bash
python3 mascot/variants/ufo/tools/build_ufo_data.py
```
