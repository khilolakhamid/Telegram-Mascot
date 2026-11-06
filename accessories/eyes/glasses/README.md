# glasses — Glasses

An eye accessory for the Telegram Mascot dog. It is a standalone component: the dog (`mascot/`) is not modified; the glasses are put on from the outside and removed without a trace.

## Usage

```tsx
import { DogMascot } from '<path>/mascot/index.js';
import { Glasses } from '<path>/accessories/eyes/glasses';

<Glasses>
  <DogMascot size={240} />
</Glasses>

<Glasses enabled={false}>…</Glasses>   // the glasses removed: the plain dog
<Glasses motion={false}>…</Glasses>    // no motion of their own, placement only
```

`Glasses` wraps exactly one `<DogMascot />` (or another accessory wrapper). Your own `ref` and `onFrame` on `DogMascot` keep working: the accessory subscribes to the dog's frames without taking them over.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `<DogMascot />` | — | the dog that wears the glasses |
| `enabled` | `boolean` | `true` | whether the glasses are worn |
| `motion` | `boolean` | `true` | lens glint and wobble on pose change |
| `className`, `style` | | | applied to the wrapper (`<span>`, inline-block) |

Without React, attach it to a dog created with `createDogAnimation`:

```js
import { createDogAnimation } from '<path>/mascot/index.js';
import { createGlasses } from '<path>/accessories/eyes/glasses';

let glasses = null;
const dog = createDogAnimation(svg, { autoPlay: false, onFrame: info => glasses && glasses.update(info) });
glasses = createGlasses(svg);
dog.play();

glasses.setVisible(false);   // hide
glasses.destroy();           // remove
```

Pass the whole `onFrame` info (including `time`) to `update`: the accessory's own motion is computed from it.

The SVG is imported as text (`glasses.svg?raw`). This works in Vite; other bundlers need an equivalent "file as string" loader.

## Files

```text
glasses/
├── Glasses.tsx          React component
├── index.ts             entry point for a standalone import
├── glasses.js           placement on the eyes + createGlasses() without React
├── glassesMotion.js     own motion: lens glint and wobble
└── assets/glasses.svg   glasses SVG (approved updated design, unchanged)
```

## Placement

In the DOM, the glasses are a separate group `<g data-accessory="glasses">` at the end of the dog's head group (`data-part="head-rig"`), drawn over the head and ears. They receive the head turn and the breathing lift through the same transform as the head, and follow pose changes with the same rig data and the same easing, so they never slide and never lag by a single frame.

Placement was measured from two reference images (`accessories/tools/fit_placement.py … glasses`). The dog's eyes are covered by the lenses in the references, so the screenshots are aligned with the dog by its grey outline and nose (accurate to within 0.2 units, verified on the references of other accessories).

| Pose | x | y | Rotation | Scale |
|---|---|---|---|---|
| 1 | 47.87 | 49.01 | −0.02° | 1 |
| 2 | 44.52 | 75.27 | 15.13° | 1 |

## Own motion

Applied on top of the head attachment; the placement itself does not change. Settings: `GLASSES_MOTION` in `glassesMotion.js`.

| Motion | How it works |
|---|---|
| Lens glint | A quick light streak (two parallel stripes in a light tone, `STREAK` in `glassesMotion.js`) passes across the glass from left to right: it appears, slides, widens slightly on the way and fades out (0.5 s per lens, up to 55% brightness). First across the left lens, 0.09 s later across the right one. The streak is clipped to the lens shape and lies under the frame, so it never leaves the glass. It repeats in every 3-second block at the same moment (1.4 s into the block), with a pause between passes. The highlights, frame and lenses from the SVG are unchanged. |
| Wobble on pose change | The glasses rotate slightly around the bridge of the nose, a spring driven by the head's acceleration. On the crouch and when standing up, about 3–4°, then a few smooth damped oscillations (about a second) and back into place. The glasses never fall off or lift off. |

The wobble starts together with the head movement and never leads it. After the dog stands up it continues into the start of the next cycle and settles within about a second. All motion is computed from the sequence time: seeking, pausing and any single frame always show the same picture, and the frame rate has no effect.

## TGS compatibility

Placement is a group translation, rotation and scale; the wobble is the rotation of one more group; the glint is the translation, scale and opacity of the stripes inside a lens-shaped mask (an Alpha Matte in Lottie). The SVG file is unchanged. The glasses' shadow in the SVG is a blur (`feGaussianBlur`); in Lottie/TGS that is the Gaussian Blur effect and should be checked on export. The first pose-1 block with the glasses is a separate file (the wobble after standing up settles in it); the second and third are identical.
