/**
 * Carrot accessory for the Telegram Mascot dog — held in the mouth.
 *
 *   import { createCarrot } from '../accessories/mouth/carrot';
 *   const carrot = createCarrot(dogSvg);     // after the dog is drawn into dogSvg
 *   carrot.update(info);                     // in the dog's onFrame ({ time, pose, … })
 *   carrot.setVisible(false); carrot.destroy();
 *
 * The SVG in ./assets/carrot.svg is the original design, used as is (only placed and moved).
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
 * Placement measured on the two reference images (tools/fit_placement.py … carrot):
 * the carrot's SVG origin in the dog's 240×240 frame, and its rotation, in each pose.
 * Scale 1 — the carrot keeps its own size (102 × 36).
 */
export const CARROT_PLACEMENT = {
  scale: 1,
  pose1: { x: 44.04, y: 140.25, rotate: -7.58 },
  pose2: { x: 17.61, y: 143.68, rotate: 21.6 }
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
