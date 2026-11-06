# cheese — Cheese on the head

A head accessory for the Telegram Mascot dog. It is a standalone component: the dog (`mascot/`) is not modified; the cheese is put on from the outside and removed without a trace.

## Usage

```tsx
import { DogMascot } from '<path>/mascot/index.js';
import { Cheese } from '<path>/accessories/head/cheese';

<Cheese>
  <DogMascot size={240} />
</Cheese>

<Cheese enabled={false}>…</Cheese>   // the cheese removed: the plain dog
<Cheese motion={false}>…</Cheese>    // no motion of its own, placement on the head only
```

`Cheese` wraps exactly one `<DogMascot />` (or another accessory wrapper). Your own `ref` and `onFrame` on `DogMascot` keep working: the accessory subscribes to the dog's frames without taking them over.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `<DogMascot />` | — | the dog the cheese sits on |
| `enabled` | `boolean` | `true` | whether the cheese is shown |
| `motion` | `boolean` | `true` | breathing and swing on pose change |
| `className`, `style` | | | applied to the wrapper (`<span>`, inline-block) |

Without React, attach it to a dog created with `createDogAnimation`:

```js
import { createDogAnimation } from '<path>/mascot/index.js';
import { createCheese } from '<path>/accessories/head/cheese';

let cheese = null;
const dog = createDogAnimation(svg, { autoPlay: false, onFrame: info => cheese && cheese.update(info) });
cheese = createCheese(svg);
dog.play();

cheese.setVisible(false);   // hide
cheese.destroy();           // remove
```

Pass the whole `onFrame` info (including `time`) to `update`: the accessory's own motion is computed from it.

The SVG is imported as text (`cheese.svg?raw`). This works in Vite; other bundlers need an equivalent "file as string" loader.

## Files

```text
cheese/
├── Cheese.tsx          React component
├── index.ts            entry point for a standalone import
├── cheese.js           placement on the head + createCheese() without React
├── cheeseMotion.js     own motion: breathing and swing
└── assets/cheese.svg   cheese SVG (original, unchanged)
```

## Placement

In the DOM, the cheese is a separate group `<g data-accessory="cheese">` at the end of the dog's head group (`data-part="head-rig"`), drawn over the head and ears. It receives the head turn and the breathing lift through the same transform as the head, and follows pose changes with the same rig data and the same easing, so it never slides and never lags by a single frame.

Placement was measured from two reference images (`accessories/tools/fit_placement.py … cheese`):

| Pose | x | y | Rotation | Scale |
|---|---|---|---|---|
| 1 | 62.16 | 20.13 | 0° | 1 |
| 2 | 69.97 | 49.67 | 18.28° | 1 |

Throughout the cycle the cheese stays inside the dog's 240×240 frame (closest to the top edge: 6.6 units, at about 11.8 s).

## Own motion

Applied on top of the head attachment; the placement itself does not change. The whole cheese moves as one piece (a single group transform) around the middle of its bottom edge, which rests on the head, so it never lifts off or slides. Settings: `CHEESE_MOTION` in `cheeseMotion.js`.

| Motion | How it works |
|---|---|
| Breathing | The cheese scales up evenly by up to 2% from the point where it rests, along the same curve and in the same phase as the dog's breathing. |
| Swing on pose change | The cheese is a springy pendulum on the head (3 oscillations per second) driven by the head's acceleration. On the crouch and when standing up it tilts slightly, about 4–5°, then a few damped oscillations (about a second) and back into place. It barely reacts to the calm head turn. |

The swing starts together with the head movement and never leads it. After the dog stands up it continues into the start of the next cycle and settles within about a second. All motion is computed from the sequence time: seeking, pausing and any single frame always show the same picture, and the frame rate has no effect.

## TGS compatibility

Placement is a group translation, rotation and scale; the own motion is the rotation and scale of one more group around the cheese. The SVG file is unchanged (fills, strokes and ellipses, no masks or effects). In Lottie/TGS it is a separate layer parented to the head, above the head and ear layers. The first pose-1 block with the cheese is a separate file (the swing after standing up settles in it); the second and third are identical.
