/**
 * Bow accessory for the Telegram Mascot dog — worn on the head.
 *
 *   import { createBow } from '../accessories/head/bow';
 *   const bow = createBow(dogSvg);           // after the dog is drawn into dogSvg
 *   bow.update(info);                        // in the dog's onFrame ({ time, pose, … })
 *   bow.setVisible(false); bow.destroy();
 *
 * The SVG in ./assets/bow.svg is the original design, used as is (only placed and moved).
 * The bow is drawn over the head and ears. It follows the head exactly (head turn, breathing,
 * both poses and the transitions); on top of that its two loops sway softly and shake when the dog
 * changes pose (bowMotion.js). The knot stays fixed on the head.
 */
import { createHeadAccessory } from '../../core/headAccessory.js';
import BOW_SVG from './assets/bow.svg?raw';
import { createBowMotion, BOW_MOTION } from './bowMotion.js';

export { BOW_SVG, BOW_MOTION };

/**
 * Placement measured on the two reference images (tools/fit_placement.py … bow):
 * the bow's SVG origin in the dog's 240×240 frame, its rotation and its size in each pose.
 * The references show the bow at 90 % of the SVG's size in pose 1 and at full size in pose 2;
 * the size changes smoothly together with the head during the transitions.
 */
export const BOW_PLACEMENT = {
  pose1: { x: 62.02, y: 13.58, rotate: -5.07, scale: 0.905 },
  pose2: { x: 64.88, y: 45.11, rotate: 8.52, scale: 0.998 }
};

export function createBow(svg, options = {}) {
  const placement = options.placement || {};
  return createHeadAccessory(svg, {
    name: 'bow',
    markup: BOW_SVG,
    layer: 'over-head',
    placement: {
      pose1: { ...BOW_PLACEMENT.pose1, ...(placement.pose1 || {}) },
      pose2: { ...BOW_PLACEMENT.pose2, ...(placement.pose2 || {}) }
    },
    // its own motion: soft sway of the loops, shake on pose change (`motion: false` turns it off)
    motion: options.motion === false ? null : createBowMotion({ ...BOW_MOTION, ...(options.motion || {}) }),
    pose: options.pose,
    time: options.time
  });
}
