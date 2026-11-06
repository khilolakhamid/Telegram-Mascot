# bone — Bone in the mouth

A mouth accessory for the Telegram Mascot dog. It is a standalone component: the dog (`mascot/`) is not modified; the bone is put on from the outside and removed without a trace.

## Usage

```tsx
import { DogMascot } from '<path>/mascot/index.js';
import { Bone } from '<path>/accessories/mouth/bone';

<Bone>
  <DogMascot size={240} />
</Bone>

<Bone enabled={false}>…</Bone>   // the bone removed: the plain dog
<Bone motion={false}>…</Bone>    // no motion of its own, placement in the mouth only
```

With a head accessory: `<Bow><Bone><DogMascot /></Bone></Bow>`.

`Bone` wraps exactly one `<DogMascot />` (or another accessory wrapper). Your own `ref` and `onFrame` on `DogMascot` keep working: the accessory subscribes to the dog's frames without taking them over.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `<DogMascot />` | — | the dog that holds the bone |
| `enabled` | `boolean` | `true` | whether the bone is shown |
| `motion` | `boolean` | `true` | breathing and swing on pose change |
| `className`, `style` | | | applied to the wrapper (`<span>`, inline-block) |

Without React, attach it to a dog created with `createDogAnimation`:

```js
import { createDogAnimation } from '<path>/mascot/index.js';
import { createBone } from '<path>/accessories/mouth/bone';

let bone = null;
const dog = createDogAnimation(svg, { autoPlay: false, onFrame: info => bone && bone.update(info) });
bone = createBone(svg);
dog.play();

bone.setVisible(false);   // hide
bone.destroy();           // remove
```

Pass the whole `onFrame` info (including `time`) to `update`: the accessory's own motion is computed from it.

The SVG is imported as text (`bone.svg?raw`). This works in Vite; other bundlers need an equivalent "file as string" loader.

## Files

```text
bone/
├── Bone.tsx          React component
├── index.ts          entry point for a standalone import
├── bone.js           placement in the mouth + createBone() without React
├── boneMotion.js     own motion: breathing and swing
└── assets/bone.svg   bone SVG (original, unchanged)
```

## Placement

In the DOM, the bone is a separate group `<g data-accessory="bone">`, the first one inside the dog's head group (`data-part="head-rig"`). The head and ears are drawn over it: the edge of the muzzle covers the middle of the bone, as if the dog holds it in its mouth; the ends lie over the body and the paws. It receives the head turn and the breathing lift through the same transform as the head, and follows pose changes with the same rig data and the same easing, so it never slides and never lags by a single frame.

Placement was measured from two reference images (`accessories/tools/fit_placement.py … bone`):

| Pose | x | y | Rotation | Scale |
|---|---|---|---|---|
| 1 | 49.12 | 128.08 | −0.04° | 1 |
| 2 | 25.17 | 143.66 | 18.96° | 1 |

## Own motion

Applied on top of the head attachment; the placement in the mouth does not change. The whole bone moves as one piece (a single group transform) and its shape is never distorted. Settings: `BONE_MOTION` in `boneMotion.js`.

| Motion | How it works |
|---|---|
| Breathing | The bone scales up evenly by up to 2% along the same curve and in the same phase as the dog's breathing. |
| Swing on pose change | The bone tilts slightly around the middle of the shaft, where the mouth holds it, a spring driven by the head's acceleration. On the crouch and when standing up, about 3.5–4°, then a few smooth damped oscillations (about 1.5 s) and back into place. The point in the mouth stays in place: the bone never falls out or shifts. |

The swing starts together with the head movement and never leads it. After the dog stands up it continues into the start of the next cycle and settles within about one and a half seconds. All motion is computed from the sequence time: seeking, pausing and any single frame always show the same picture, and the frame rate has no effect.

## TGS compatibility

Placement is a group translation, rotation and scale; the own motion is the rotation and scale of one more group around the bone. The SVG file is unchanged. In Lottie/TGS it is a separate layer parented to the head, below the head and ear layers. The first pose-1 block with the bone is a separate file (the swing after standing up settles in it); the second and third are identical.
