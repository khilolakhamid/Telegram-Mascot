/**
 * Cheese accessory for the Telegram Mascot dog — lies on the head.
 *
 *   import { createCheese } from '../accessories/head/cheese';
 *   const cheese = createCheese(dogSvg);     // after the dog is drawn into dogSvg
 *   cheese.update(info);                     // in the dog's onFrame ({ time, pose, … })
 *   cheese.setVisible(false); cheese.destroy();
 *
 * The SVG in ./assets/cheese.svg is the original design, used as is (only placed and moved).
 * The cheese is drawn over the head and ears. It follows the head exactly (head turn, breathing,
 * both poses and the transitions); on top of that it breathes and rocks a little when the dog changes
 * pose (cheeseMotion.js). Every motion turns around the middle of its bottom edge, where it lies on
 * the head, so it never lifts off or slides.
 */
import { createHeadAccessory } from '../../core/headAccessory.js';
import CHEESE_SVG from './assets/cheese.svg?raw';
import { createCheeseMotion, CHEESE_MOTION } from './cheeseMotion.js';

export { CHEESE_SVG, CHEESE_MOTION };

/**
 * Placement measured on the two reference images (tools/fit_placement.py … cheese):
 * the cheese's SVG origin in the dog's 240×240 frame, and its rotation, in each pose.
 * Scale 1 — the cheese keeps its own size (82 × 43).
 */
export const CHEESE_PLACEMENT = {
  scale: 1,
  pose1: { x: 62.16, y: 20.13, rotate: 0 },
  pose2: { x: 69.97, y: 49.67, rotate: 18.28 }
};

export function createCheese(svg, options = {}) {
  return createHeadAccessory(svg, {
    name: 'cheese',
    markup: CHEESE_SVG,
    layer: 'over-head',
    placement: { ...CHEESE_PLACEMENT, ...(options.placement || {}) },
    // its own motion: breathing, rocking on pose change (`motion: false` turns it off)
    motion: options.motion === false ? null : createCheeseMotion({ ...CHEESE_MOTION, ...(options.motion || {}) }),
    pose: options.pose,
    time: options.time
  });
}
