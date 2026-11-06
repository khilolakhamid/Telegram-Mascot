# duck — Duck on the head

A head accessory for the telegram-mascot dog. It is a standalone component: the dog (`mascot/`) is not modified; the duck is put on from the outside and removed without a trace.

## Usage

```tsx
import { DogMascot } from '<path>/mascot/index.js';
import { Duck } from '<path>/accessories/head/duck';

<Duck>
  <DogMascot size={240} />
</Duck>

<Duck enabled={false}>…</Duck>   // the duck removed: the plain dog
<Duck motion={false}>…</Duck>    // no motion of its own, placement on the head only
```

With a mouth accessory: `<Duck><Ball><DogMascot /></Ball></Duck>`.

`Duck` wraps exactly one `<DogMascot />` (or another accessory wrapper). Your own `ref` and `onFrame` on `DogMascot` keep working: the accessory subscribes to the dog's frames without taking them over.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `<DogMascot />` | — | the dog the duck sits on |
| `enabled` | `boolean` | `true` | whether the duck is shown |
| `motion` | `boolean` | `true` | breathing, balancing, swing on pose change |
| `className`, `style` | | | applied to the wrapper (`<span>`, inline-block) |

Without React, attach it to a dog created with `createDogAnimation`:

```js
import { createDogAnimation } from '<path>/mascot/index.js';
import { createDuck } from '<path>/accessories/head/duck';

let duck = null;
const dog = createDogAnimation(svg, { autoPlay: false, onFrame: info => duck && duck.update(info) });
duck = createDuck(svg);
dog.play();

duck.setVisible(false);   // hide
duck.destroy();           // remove
```

Pass the whole `onFrame` info (including `time`) to `update`: the accessory's own motion is computed from it.

The SVG is imported as text (`duck.svg?raw`). This works in Vite; other bundlers need an equivalent "file as string" loader.

## Files

```text
duck/
├── Duck.tsx          React component
├── index.ts          entry point for a standalone import
├── duck.js           placement on the head + createDuck() without React
├── duckMotion.js     own motion: breathing, balancing, swing
└── assets/duck.svg   duck SVG (original, unchanged)
```

## Placement

In the DOM, the duck is a separate group `<g data-accessory="duck">` at the end of the dog's head group (`data-part="head-rig"`), drawn over the head and ears. It receives the head turn and the breathing lift through the same transform as the head, and follows pose changes with the same rig data and the same easing, so it never slides and never lags by a single frame.

Placement was measured from two reference images (`accessories/tools/fit_placement.py … duck`):

| Pose | x | y | Rotation | Scale |
|---|---|---|---|---|
| 1 | 63.36 | −2.94 | −12.73° | 1 |
| 2 | 76.83 | 27.53 | −0.05° | 1 |

**Frame bounds.** In pose 1 the duck sits right at the top edge of the dog's 240×240 frame, and when the head rises (head turn, standing up) and the duck swings, it goes beyond it, up to 25 px at about 11.8 s. Inside a 240×240 frame that part would be clipped, so the try-on page leaves room around the dog's frame; the iPhone screen and a TGS export need the same room at the top.

## Own motion

Applied on top of the head attachment; the placement itself does not change. The whole duck moves as one piece (a single group transform) around the point where it sits on the head, so it never lifts off or slides. The soft shadow under the duck (a blurred ellipse in the SVG) stays on the head. Settings: `DUCK_MOTION` in `duckMotion.js`.

| Motion | How it works |
|---|---|
| Breathing | The duck scales up evenly by up to 2% from the point where it sits, along the same curve and in the same phase as the dog's breathing. |
| Balancing | A gentle side-to-side sway, ±3°, one swing per 3-second block. |
| Swing on pose change | The duck is a springy pendulum on the head (3 oscillations per second) driven by the head's acceleration. On the crouch and when standing up it tilts noticeably, about 10°, then a few damped oscillations (about a second) and back to its resting position. It reacts only slightly to the calm head turn. |

The swing starts together with the head movement and never leads it. After the dog stands up it continues into the start of the next cycle and settles within about a second. All motion is computed from the sequence time: seeking, pausing and any single frame always show the same picture, and the frame rate has no effect.

## TGS compatibility

Placement is a group translation, rotation and scale; the own motion is the rotation and scale of one more group around the duck. The SVG file is unchanged. The duck's shadow in the SVG is a blur (`feGaussianBlur`); in Lottie/TGS that is the Gaussian Blur effect, which Telegram supports, but it should be checked on export. In Lottie/TGS the duck is a separate layer parented to the head, above the head and ear layers. The first pose-1 block with the duck is a separate file (the swing after standing up settles in it); the second and third are identical.
