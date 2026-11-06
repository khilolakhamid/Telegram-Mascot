/**
 * Ball accessory for the telegram-mascot dog — held in the mouth.
 *
 *   import { createBall } from '../accessories/mouth/ball';
 *   const ball = createBall(dogSvg);         // after the dog is drawn into dogSvg
 *   ball.update(info);                       // in the dog's onFrame ({ time, pose, … })
 *   ball.setVisible(false); ball.destroy();
 *
 * The SVG in ./assets/ball.svg is the original design, used as is (only placed and moved).
 * The ball is drawn under the dog's head and ears and over the body and legs, so the muzzle
 * overlaps its top: the dog holds it in the mouth. It follows the head exactly (head turn,
 * breathing, both poses and the transitions); on top of that it breathes and wobbles a little in
 * the mouth when the dog changes pose (ballMotion.js).
 */
import { createHeadAccessory } from '../../core/headAccessory.js';
import BALL_SVG from './assets/ball.svg?raw';
import { createBallMotion, BALL_MOTION } from './ballMotion.js';

export { BALL_SVG, BALL_MOTION };

/**
 * Placement measured on the two reference images (tools/fit_placement.py … ball):
 * the ball's SVG origin in the dog's 240×240 frame, and its rotation, in each pose.
 * Scale 1 — the ball keeps its own size (61 × 61).
 */
export const BALL_PLACEMENT = {
  scale: 1,
  pose1: { x: 71.17, y: 127.2, rotate: 0.14 },
  pose2: { x: 43.82, y: 147.95, rotate: 23.52 }
};

export function createBall(svg, options = {}) {
  return createHeadAccessory(svg, {
    name: 'ball',
    markup: BALL_SVG,
    layer: 'under-head',
    placement: { ...BALL_PLACEMENT, ...(options.placement || {}) },
    // its own motion: breathing, wobble on pose change (`motion: false` turns it off)
    motion: options.motion === false ? null : createBallMotion({ ...BALL_MOTION, ...(options.motion || {}) }),
    pose: options.pose,
    time: options.time
  });
}
