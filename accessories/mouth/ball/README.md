# ball — Ball in the mouth

A mouth accessory for the telegram-mascot dog. It is a standalone component: the dog (`mascot/`) is not modified; the ball is put on from the outside and removed without a trace.

## Usage

```tsx
import { DogMascot } from '<path>/mascot/index.js';
import { Ball } from '<path>/accessories/mouth/ball';

<Ball>
  <DogMascot size={240} />
</Ball>

<Ball enabled={false}>…</Ball>   // the ball removed: the plain dog
<Ball motion={false}>…</Ball>    // no motion of its own, placement in the mouth only
```

With a head accessory: `<Bow><Ball><DogMascot /></Ball></Bow>` or `<ChristmasHat><Ball><DogMascot /></Ball></ChristmasHat>`.

`Ball` wraps exactly one `<DogMascot />` (or another accessory wrapper). Your own `ref` and `onFrame` on `DogMascot` keep working: the accessory subscribes to the dog's frames without taking them over.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `<DogMascot />` | — | the dog that holds the ball |
| `enabled` | `boolean` | `true` | whether the ball is shown |
| `motion` | `boolean` | `true` | breathing and swing on pose change |
| `className`, `style` | | | applied to the wrapper (`<span>`, inline-block) |

Without React, attach it to a dog created with `createDogAnimation`:

```js
import { createDogAnimation } from '<path>/mascot/index.js';
import { createBall } from '<path>/accessories/mouth/ball';

let ball = null;
const dog = createDogAnimation(svg, { autoPlay: false, onFrame: info => ball && ball.update(info) });
ball = createBall(svg);
dog.play();

ball.setVisible(false);   // hide
ball.destroy();           // remove
```

Pass the whole `onFrame` info (including `time`) to `update`: the accessory's own motion is computed from it.

The SVG is imported as text (`ball.svg?raw`). This works in Vite; other bundlers need an equivalent "file as string" loader.

## Files

```text
ball/
├── Ball.tsx          React component
├── index.ts          entry point for a standalone import
├── ball.js           placement in the mouth + createBall() without React
├── ballMotion.js     own motion: breathing and swing
└── assets/ball.svg   ball SVG (original, unchanged)
```

## Placement

In the DOM, the ball is a separate group `<g data-accessory="ball">`, the first one inside the dog's head group (`data-part="head-rig"`). The head and ears are drawn over it: the muzzle covers the top of the ball, as if the dog holds it in its mouth; the ball itself lies over the body and the paws. It receives the head turn and the breathing lift through the same transform as the head, and follows pose changes with the same rig data and the same easing, so it never slides and never lags by a single frame.

Placement was measured from two reference images (`accessories/tools/fit_placement.py … ball`):

| Pose | x | y | Rotation | Scale |
|---|---|---|---|---|
| 1 | 71.17 | 127.20 | 0.14° | 1 |
| 2 | 43.82 | 147.95 | 23.52° | 1 |

## Own motion

Applied on top of the head attachment; the placement in the mouth does not change. The whole ball moves as one piece (a single group transform) and its shape is never distorted. Settings: `BALL_MOTION` in `ballMotion.js`.

| Motion | How it works |
|---|---|
| Breathing | The ball scales up evenly by up to 2% along the same curve and in the same phase as the dog's breathing. |
| Swing on pose change | The ball rotates slightly around the point where the mouth holds it (the top of the ball), like a short pendulum driven by the head's acceleration. On the crouch and when standing up, up to 4–5°, then a few smooth damped oscillations (about 1.5 s) and back to its resting position. The point in the mouth stays in place: the ball never falls out or shifts. |

The swing starts together with the head movement and never leads it. After the dog stands up it continues into the start of the next cycle and settles within about one and a half seconds. All motion is computed from the sequence time: seeking, pausing and any single frame always show the same picture, and the frame rate has no effect.

## TGS compatibility

Placement is a group translation, rotation and scale; the own motion is the rotation and scale of one more group around the ball. The SVG file is unchanged. In Lottie/TGS it is a separate layer parented to the head, below the head and ear layers. The first pose-1 block with the ball is a separate file (the swing after standing up settles in it); the second and third are identical.
