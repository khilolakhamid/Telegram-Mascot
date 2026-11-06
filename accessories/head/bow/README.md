# bow — Bow

A head accessory for the telegram-mascot dog. It is a standalone component: the dog (`mascot/`) is not modified; the bow is put on from the outside and removed without a trace.

## Usage

```tsx
import { DogMascot } from '<path>/mascot/index.js';
import { Bow } from '<path>/accessories/head/bow';

<Bow>
  <DogMascot size={240} />
</Bow>

<Bow enabled={false}>…</Bow>   // the bow removed: the plain dog
<Bow motion={false}>…</Bow>    // no motion of its own, placement on the head only
```

Together with the carrot: `<Bow><Carrot><DogMascot /></Carrot></Bow>`.

`Bow` wraps exactly one `<DogMascot />` (or another accessory wrapper). Your own `ref` and `onFrame` on `DogMascot` keep working: the accessory subscribes to the dog's frames without taking them over.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `<DogMascot />` | — | the dog that wears the bow |
| `enabled` | `boolean` | `true` | whether the bow is worn |
| `motion` | `boolean` | `true` | sway and shake of the loops |
| `className`, `style` | | | applied to the wrapper (`<span>`, inline-block) |

Without React, attach it to a dog created with `createDogAnimation`:

```js
import { createDogAnimation } from '<path>/mascot/index.js';
import { createBow } from '<path>/accessories/head/bow';

let bow = null;
const dog = createDogAnimation(svg, { autoPlay: false, onFrame: info => bow && bow.update(info) });
bow = createBow(svg);
dog.play();

bow.setVisible(false);   // hide
bow.destroy();           // remove
```

Pass the whole `onFrame` info (including `time`) to `update`: the accessory's own motion is computed from it.

The SVG is imported as text (`bow.svg?raw`). This works in Vite; other bundlers need an equivalent "file as string" loader.

## Files

```text
bow/
├── Bow.tsx          React component
├── index.ts         entry point for a standalone import
├── bow.js           placement on the head + createBow() without React
├── bowMotion.js     own motion: sway and shake of the loops
└── assets/bow.svg   bow SVG (original, unchanged)
```

## Placement

In the DOM, the bow is a separate group `<g data-accessory="bow">` at the end of the dog's head group (`data-part="head-rig"`), drawn over the head and ears. It receives the head turn and the breathing lift through the same transform as the head, and follows pose changes with the same rig data and the same easing, so it never slides and never lags by a single frame.

Placement was measured from two reference images (`accessories/tools/fit_placement.py … bow`):

| Pose | x | y | Rotation | Scale |
|---|---|---|---|---|
| 1 | 62.02 | 13.58 | −5.07° | 0.905 |
| 2 | 64.88 | 45.11 | 8.52° | 0.998 |

In the references the bow is 10% smaller in pose 1 than in pose 2; the size changes smoothly together with the head.

## Own motion

Applied on top of the head attachment; the placement itself does not change. Settings: `BOW_MOTION` in `bowMotion.js`.

| Motion | How it works |
|---|---|
| Gentle sway | Both loops smoothly flap up and down around the knot, ±4° at the edges, one swing per 3-second block, with a light springy overtone. The right loop slightly leads the left one. The rotation grows from the knot to the edge; the knot stays fixed on the head. |
| Shake on pose change | Each loop is a light, fast spring (3 oscillations per second) driven by the head's acceleration, like the carrot's leaves. On the crouch and when standing up there is a sharp deflection of about 15°, then a few damped oscillations (about a second) and back to the calm sway. |

The shake starts together with the head movement and never leads it. After the dog stands up it continues into the start of the next cycle and settles within about a second. All motion is computed from the sequence time: seeking, pausing and any single frame always show the same picture, and the frame rate has no effect. The cycle repeats indefinitely.

## TGS compatibility

Placement is a group translation, rotation and scale; the own motion is path animation. The SVG file is unchanged. In Lottie/TGS it is a separate layer parented to the head, above the head and ear layers. The first pose-1 block with the bow is a separate file (the shake after standing up settles in it); the second and third are identical.
