# Skeleton Dog — mascot skin

A standalone model of the dog: its own SVGs, its own layer structure, its own morph data
and its own rendering engine. The behaviour (the 12-second sequence, timing, amplitudes,
pivot points, body-part movements) is shared with the Original Dog: the behaviour settings
and body-part trajectories are read from the original component, read-only.
Switching the skin therefore changes only the look.

## Files

```text
variants/
├── index.js                      skin registry: SKINS.original, SKINS.skeleton
└── skeleton/
    ├── assets/                   skeleton-pose-1.svg, skeleton-pose-2.svg (sources)
    ├── animations/
    │   ├── skeletonAnimation.js  skin engine (createSkeletonAnimation)
    │   ├── skeletonMorph.js      morphing of outlines, gradients and glow
    │   └── skeletonMorphData.json
    ├── components/SkeletonDog.jsx
    ├── tools/build_skeleton_data.py
    ├── demo/                     Original vs Skeleton on a shared timer
    └── index.js
```

## Usage

```jsx
import { SkeletonDog } from './mascot/variants/skeleton/index.js';
<SkeletonDog size={240} />
```

Props and methods are the same as on `DogMascot`: `size`, `playing`, `startTime`, `onFrame`,
`play()`, `pause()`, `seek()`. Switching skins:

```jsx
import { SKINS } from './mascot/variants/index.js';
const { Component } = SKINS[skin];   // 'original' | 'skeleton' | 'ufo'
<Component size={240} />
```

To compare the two skins: `cd mascot && npm run dev`, then open
`http://localhost:5173/variants/skeleton/demo/`.

## How the bones work

Every bone, rib, vertebra and glow spot is an element of its own body part:

- leg bones, pads and toes belong to the leg group: they rotate with it,
  and their shape blends smoothly from the first pose to the second;
- ribs and body bones belong to the body group: they breathe with it and
  move smoothly to their places in the second pose;
- tail vertebrae belong to the tail group and sway with it;
- eyes: the base, gradient, glow and highlight blink together.

The glow is a blur (`feGaussianBlur`) whose strength changes smoothly between the poses.
The highlight on the muzzle is radial in the first pose and linear in the second, so during
the transition its two versions cross-fade.

## Rebuilding the data

After changing the SVGs in `assets/`:

```bash
python3 mascot/variants/skeleton/tools/build_skeleton_data.py
```

## TGS

Blur is a layer effect, and Telegram TGS does not support layer effects. For a sticker export
the glow has to be replaced with radial gradients that fade to transparent at the edge.
