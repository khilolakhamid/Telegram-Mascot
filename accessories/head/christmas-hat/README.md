# christmas-hat — Christmas hat

A head accessory for the Telegram Mascot dog. It is a standalone component: the dog (`mascot/`) is not modified; the hat is put on from the outside and removed without a trace.

## Usage

```tsx
import { DogMascot } from '<path>/mascot/index.js';
import { ChristmasHat } from '<path>/accessories/head/christmas-hat';

<ChristmasHat>
  <DogMascot size={240} />
</ChristmasHat>

<ChristmasHat enabled={false}>…</ChristmasHat>   // the hat removed: the plain dog
<ChristmasHat motion={false}>…</ChristmasHat>    // no fabric motion, placement only
```

`ChristmasHat` wraps exactly one `<DogMascot />` (or another accessory wrapper). Your own `ref` and `onFrame` on `DogMascot` keep working: the accessory subscribes to the dog's frames without taking them over.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `<DogMascot />` | — | the dog that wears the hat |
| `enabled` | `boolean` | `true` | whether the hat is worn |
| `motion` | `boolean` | `true` | sway, breathing and bounce |
| `className`, `style` | | | applied to the wrapper (`<span>`, inline-block) |

Without React, attach it to a dog created with `createDogAnimation`:

```js
import { createDogAnimation } from '<path>/mascot/index.js';
import { createChristmasHat } from '<path>/accessories/head/christmas-hat';

let hat = null;
const dog = createDogAnimation(svg, { autoPlay: false, onFrame: info => hat && hat.update(info) });
hat = createChristmasHat(svg);
dog.play();

hat.setVisible(false);   // hide
hat.destroy();           // remove
```

Pass the whole `onFrame` info (including `time`) to `update`: the accessory's own motion is computed from it.

The SVG is imported as text (`christmas-hat.svg?raw`). This works in Vite; other bundlers need an equivalent "file as string" loader.

## Files

```text
christmas-hat/
├── ChristmasHat.tsx          React component
├── index.ts                  entry point for a standalone import
├── christmasHat.js           placement on the head + createChristmasHat() without React
├── christmasHatMotion.js     fabric motion: tip, breathing, bounce
└── assets/christmas-hat.svg  approved hat SVG
```

The shared engine for head accessories lives in `accessories/core/`.

## Placement

In the DOM, the hat is a separate group `<g data-accessory="christmas-hat">` inside the dog's head group (`data-part="head-rig"`). It receives the head turn and the breathing lift through the same transform as the head, and follows pose changes with the same rig data and the same easing as the head, never leading or lagging by a single frame.

Placement was measured from two reference images (`accessories/tools/fit_placement.py`):

| Pose | x | y | Rotation | Scale |
|---|---|---|---|---|
| 1 | 72.32 | 0.00 | 0° | 1 |
| 2 | 88.62 | 35.56 | 23.18° | 1 |

The hat is drawn over the head and ears.

## Fabric motion

Settings: `CHRISTMAS_HAT_MOTION` in `christmasHatMotion.js`.

| Motion | How it works |
|---|---|
| Tip sway | The tip slowly bends left and right, ±4.5° at the pom-pom, one swing per 3-second block. The bend grows from the fold to the pom-pom; the base stays still. In the play pose the amplitude is 30% larger. |
| Breathing | The crown stretches slightly (up to 3% of its height) and widens (up to 1.2%) along the same curve and in the same phase as the dog's breathing. The pom-pom "breathes" by 2%. |
| Bounce on pose change | The crown and the tip are damped springs driven by the head's acceleration. On the crouch and the return the crown lags, bounces (no more than 7% of its height) and settles; the tip follows with inertia. |
| Hop after the return | When the dog is back in pose 1, the hat hops once more (about 3 px), settles slightly and comes to rest within 0.6 s. The tip swings along. |

The fur brim that sits on the head never moves: the hat never lifts off or slips; only the fabric above the brim moves.

All motion is computed from the sequence time: seeking, pausing and any single frame always show the same picture, and the frame rate has no effect.

## TGS compatibility

Placement is a group translation, rotation and scale; the fabric motion is path animation plus a pom-pom transform. Fills and strokes only, no masks or effects. In Lottie/TGS it is a separate layer parented to the head. The bounce settles within its own 3-second block. The hop after the return happens in the first 0.6 s of the block after the play pose, so that block with the hat is a separate file; the second and third pose-1 blocks are identical.

## Design

`assets/christmas-hat.svg` is the approved version: the original SVG with the colour `#EDF0F2` (the fill of the brim and the pom-pom) replaced by `#DEE6EB`.
