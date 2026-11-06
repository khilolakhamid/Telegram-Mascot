# carrot — Carrot in the mouth

A mouth accessory for the Telegram Mascot dog. It is a standalone component: the dog (`mascot/`) is not modified; the carrot is put on from the outside and removed without a trace.

## Usage

```tsx
import { DogMascot } from '<path>/mascot/index.js';
import { Carrot } from '<path>/accessories/mouth/carrot';

<Carrot>
  <DogMascot size={240} />
</Carrot>

<Carrot enabled={false}>…</Carrot>   // the carrot removed: the plain dog
<Carrot motion={false}>…</Carrot>    // no motion of its own, placement in the mouth only
```

Together with the Christmas hat:

```tsx
<ChristmasHat>
  <Carrot>
    <DogMascot size={240} />
  </Carrot>
</ChristmasHat>
```

`Carrot` wraps exactly one `<DogMascot />` (or another accessory wrapper). Your own `ref` and `onFrame` on `DogMascot` keep working: the accessory subscribes to the dog's frames without taking them over.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `<DogMascot />` | — | the dog that holds the carrot |
| `enabled` | `boolean` | `true` | whether the carrot is shown |
| `motion` | `boolean` | `true` | leaf sway, breathing, shake |
| `className`, `style` | | | applied to the wrapper (`<span>`, inline-block) |

Without React, attach it to a dog created with `createDogAnimation`:

```js
import { createDogAnimation } from '<path>/mascot/index.js';
import { createCarrot } from '<path>/accessories/mouth/carrot';

let carrot = null;
const dog = createDogAnimation(svg, { autoPlay: false, onFrame: info => carrot && carrot.update(info) });
carrot = createCarrot(svg);
dog.play();

carrot.setVisible(false);   // hide
carrot.destroy();           // remove
```

Pass the whole `onFrame` info (including `time`) to `update`: the accessory's own motion is computed from it.

The SVG is imported as text (`carrot.svg?raw`). This works in Vite; other bundlers need an equivalent "file as string" loader.

## Files

```text
carrot/
├── Carrot.tsx         React component
├── index.ts           entry point for a standalone import
├── carrot.js          placement in the mouth + createCarrot() without React
├── carrotMotion.js    own motion: leaves, breathing, shake
└── assets/carrot.svg  carrot SVG, approved design (unchanged)
```

## Placement

In the DOM, the carrot is a separate group `<g data-accessory="carrot">`, the first one inside the dog's head group (`data-part="head-rig"`). Therefore:

- the head and ears are drawn over the carrot: its top edge goes under the muzzle, as if in the mouth, and the rest stays outside;
- the carrot lies over the body and the paws;
- it receives the head turn and the breathing lift through the same transform as the head, and follows pose changes with the same rig data and the same easing, so it never slides and never lags by a single frame.

The placement of the first carrot was measured from two reference images (`accessories/tools/fit_placement.py … carrot`). The current design is the same carrot drawn 1.138 times larger (109 × 43, thicker outlines). Its scale of 0.8785 and offset are chosen so that the root and the eyes land exactly where they were on the first carrot: the same point in the mouth, the same size and the same tilt.

| Pose | x | y | Rotation | Scale |
|---|---|---|---|---|
| 1 | 43.95 | 139.59 | −7.58° | 0.8785 |
| 2 | 17.86 | 143.06 | 21.60° | 0.8785 |

## Own motion

Applied on top of the head attachment; the placement in the mouth does not change. The motion is the same as on the first carrot: the bend and breathing points of the leaves were moved onto the new drawing, and the leaf length for inertia is measured in dog units, so the sway, breathing and shake match the approved ones. The root's outline in the SVG is a mask, and the mask changes together with the outline while breathing. Settings: `CARROT_MOTION` in `carrotMotion.js`.

| Motion | How it works |
|---|---|
| Leaf sway | The leaves slowly bend around their base, ±5° at the leaf tips, one swing per 3-second block. The bend grows from the base to the tips; the base stays fixed on the carrot. |
| Breathing | The root gets slightly thicker (up to 3%) and longer (up to 1%) along the same curve and in the same phase as the dog's breathing. The eyes and the smile move with it. |
| Shake on pose change | The leaves are a light, fast spring (3.4 oscillations per second) driven by the head's acceleration. On the crouch there is a sharp deflection of about 18°, when standing up about 14°, then a few damped oscillations (about a second) and back to the calm sway. |

The shake starts together with the head movement and never leads it. Single acceleration spikes at the joints between pose stages are smoothed and cause no jerks. The shake after standing up continues into the start of the next cycle (0–1.2 s) and settles by the middle of the first block. The second and third pose-1 blocks are identical.

All motion is computed from the sequence time: seeking, pausing and any single frame always show the same picture, and the frame rate has no effect.

## TGS compatibility

Placement is a group translation, rotation and scale; the own motion is path animation and the position of the eye circles. The SVG file is unchanged. In Lottie/TGS it is a separate layer parented to the head, below the head and ear layers. The first pose-1 block with the carrot is a separate file (the shake after standing up settles in it); the second and third are identical.
