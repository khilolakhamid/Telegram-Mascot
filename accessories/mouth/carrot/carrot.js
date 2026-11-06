/**
 * Carrot accessory for the telegram-mascot dog — held in the mouth.
 *
 *   import { createCarrot } from '../accessories/mouth/carrot';
 *   const carrot = createCarrot(dogSvg);     // after the dog is drawn into dogSvg
 *   carrot.update(info);                     // in the dog's onFrame ({ time, pose, … })
 *   carrot.setVisible(false); carrot.destroy();
 *
 * The SVG in ./assets/carrot.svg is the approved design, used as is (only placed and moved).
 * The carrot is drawn under the dog's head and ears and over the body and legs, so the muzzle
 * overlaps it: one part is in the mouth, the rest sticks out. It follows the head exactly
 * (head turn, breathing, both poses and the transitions); on top of that its leaves sway, the root
 * breathes and the leaves shake when the dog changes pose (carrotMotion.js).
 */
import { createHeadAccessory } from '../../core/headAccessory.js';
import CARROT_SVG from './assets/carrot.svg?raw';
import { createCarrotMotion, CARROT_MOTION } from './carrotMotion.js';

export { CARROT_SVG, CARROT_MOTION };

/**
 * Placement in the mouth: the carrot's SVG origin in the dog's 240×240 frame, its rotation and size,
 * in each pose. The drawing (109 × 43) is the first carrot design redrawn 1.138 times bigger; it is
 * placed at 0.8785 and shifted so that its root and eyes land exactly where the first carrot's were
 * (measured on the two reference images with tools/fit_placement.py … carrot): same spot in the
 * mouth, same size, same rotation.
 */
export const CARROT_PLACEMENT = {
  scale: 0.8785,
  pose1: { x: 43.95, y: 139.59, rotate: -7.58 },
  pose2: { x: 17.86, y: 143.06, rotate: 21.6 }
};

export function createCarrot(svg, options = {}) {
  return createHeadAccessory(svg, {
    name: 'carrot',
    markup: CARROT_SVG,
    layer: 'under-head',
    placement: { ...CARROT_PLACEMENT, ...(options.placement || {}) },
    // its own motion: leaf sway, breathing, shake on pose change (`motion: false` turns it off)
    motion: options.motion === false ? null : createCarrotMotion({ ...CARROT_MOTION, ...(options.motion || {}) }),
    pose: options.pose,
    time: options.time
  });
}
