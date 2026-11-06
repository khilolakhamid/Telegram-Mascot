/**
 * Duck accessory for the Telegram Mascot dog — sits on the head.
 *
 *   import { createDuck } from '../accessories/head/duck';
 *   const duck = createDuck(dogSvg);         // after the dog is drawn into dogSvg
 *   duck.update(info);                       // in the dog's onFrame ({ time, pose, … })
 *   duck.setVisible(false); duck.destroy();
 *
 * The SVG in ./assets/duck.svg is the original design, used as is (only placed and moved).
 * The duck is drawn over the head and ears. It follows the head exactly (head turn, breathing,
 * both poses and the transitions); on top of that it breathes, balances gently from side to side
 * and rocks when the dog changes pose (duckMotion.js). Every motion turns around the point where it
 * sits on the head, so it never lifts off; its soft shadow stays on the head.
 */
import { createHeadAccessory } from '../../core/headAccessory.js';
import DUCK_SVG from './assets/duck.svg?raw';
import { createDuckMotion, DUCK_MOTION } from './duckMotion.js';

export { DUCK_SVG, DUCK_MOTION };

/**
 * Placement measured on the two reference images (tools/fit_placement.py … duck):
 * the duck's SVG origin in the dog's 240×240 frame, and its rotation, in each pose.
 * Scale 1 — the duck keeps its own size (57 × 62).
 */
export const DUCK_PLACEMENT = {
  scale: 1,
  pose1: { x: 63.36, y: -2.94, rotate: -12.73 },
  pose2: { x: 76.83, y: 27.53, rotate: -0.05 }
};

export function createDuck(svg, options = {}) {
  return createHeadAccessory(svg, {
    name: 'duck',
    markup: DUCK_SVG,
    layer: 'over-head',
    placement: { ...DUCK_PLACEMENT, ...(options.placement || {}) },
    // its own motion: breathing, balancing, rocking on pose change (`motion: false` turns it off)
    motion: options.motion === false ? null : createDuckMotion({ ...DUCK_MOTION, ...(options.motion || {}) }),
    pose: options.pose,
    time: options.time
  });
}
