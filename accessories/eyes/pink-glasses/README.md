# pink-glasses — Pink glasses

An eye accessory for the telegram-mascot dog. It is a standalone component: the dog (`mascot/`) is not modified; the glasses are put on from the outside and removed without a trace. They are based on the green glasses ([`../glasses/`](../glasses/)): the same engine and the same motion with the same timings; only the drawing and the placement are their own. The green glasses are unchanged, and the two accessories are independent.

## Usage

```tsx
import { DogMascot } from '<path>/mascot/index.js';
import { PinkGlasses } from '<path>/accessories/eyes/pink-glasses';

<PinkGlasses>
  <DogMascot size={240} />
</PinkGlasses>

<PinkGlasses enabled={false}>…</PinkGlasses>   // the glasses removed: the plain dog
<PinkGlasses motion={false}>…</PinkGlasses>    // no motion of their own, placement only
```

`PinkGlasses` wraps exactly one `<DogMascot />` (or another accessory wrapper). Your own `ref` and `onFrame` on `DogMascot` keep working: the accessory subscribes to the dog's frames without taking them over.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `<DogMascot />` | — | the dog that wears the glasses |
| `enabled` | `boolean` | `true` | whether the glasses are worn |
| `motion` | `boolean` | `true` | lens glint and wobble on pose change |
| `className`, `style` | | | applied to the wrapper (`<span>`, inline-block) |

Without React, attach it to a dog created with `createDogAnimation`:

```js
import { createDogAnimation } from '<path>/mascot/index.js';
import { createPinkGlasses } from '<path>/accessories/eyes/pink-glasses';

let glasses = null;
const dog = createDogAnimation(svg, { autoPlay: false, onFrame: info => glasses && glasses.update(info) });
glasses = createPinkGlasses(svg);
dog.play();

glasses.setVisible(false);   // hide
glasses.destroy();           // remove
```

Pass the whole `onFrame` info (including `time`) to `update`: the accessory's own motion is computed from it.

The SVG is imported as text (`pink-glasses.svg?raw`). This works in Vite; other bundlers need an equivalent "file as string" loader.

## Files

```text
pink-glasses/
├── PinkGlasses.tsx           React component
├── index.ts                  entry point for a standalone import
├── pinkGlasses.js            placement on the eyes + createPinkGlasses() without React
├── pinkGlassesMotion.js      own motion: lens glint and wobble (as on the green glasses)
└── assets/pink-glasses.svg   pink glasses SVG (unchanged)
```

## Placement

In the DOM, the glasses are a separate group `<g data-accessory="pink-glasses">` at the end of the dog's head group (`data-part="head-rig"`), drawn over the head and ears. They follow the head turn, the breathing lift and pose changes together with the head, never sliding or lagging by a single frame.

Placement was measured from two reference images (`accessories/tools/fit_placement.py … pink-glasses`). The dog's eyes are covered by the lenses in the references, so the screenshots are aligned with the dog by its grey outline and nose.

| Pose | x | y | Rotation | Scale |
|---|---|---|---|---|
| 1 | 42.62 | 50.59 | −0.02° | 1 |
| 2 | 44.73 | 75.86 | 19.96° | 1 |

## Own motion

The same as on the green glasses, with the same settings (`PINK_GLASSES_MOTION` in `pinkGlassesMotion.js`). Like the green glasses, they have no breathing of their own: they rise with the head when the dog breathes.

| Motion | How it works |
|---|---|
| Lens glint | The same quick light streak as on the green glasses (two parallel stripes of the same shape and slant, moved to the centres of the pink lenses) passes across the glass from left to right: it appears, slides, widens slightly on the way and fades out (0.5 s per lens, up to 55% brightness). First across the left lens, 0.09 s later across the right one; in every 3-second block at 1.4 s into the block. The streak is clipped to the lens shape and lies under the frame. The frame, lenses and highlights from the SVG are unchanged. |
| Wobble on pose change | The glasses rotate slightly around the bridge of the nose, the same spring (2.6 oscillations per second) driven by the head's acceleration: on the crouch and when standing up, about 3–4°, then a few damped oscillations (about a second) and back into place. It never leads the head. |

All motion is computed from the sequence time: seeking, pausing and any single frame always show the same picture, and the frame rate has no effect.

## TGS compatibility

Placement is a group translation, rotation and scale; the wobble is the rotation of one more group; the glint is the translation, scale and opacity of the stripes inside a lens-shaped mask (an Alpha Matte in Lottie). The lenses and the frame are linear gradients; the SVG has no filters. The SVG file is unchanged.
