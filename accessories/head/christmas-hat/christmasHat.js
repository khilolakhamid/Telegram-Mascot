/**
 * Christmas hat accessory for the telegram-mascot dog.
 *
 *   import { createChristmasHat } from '../accessories/head/christmas-hat';
 *   const hat = createChristmasHat(dogSvg);      // after the dog is drawn into dogSvg
 *   hat.update(info);                        // in the dog's onFrame ({ time, pose, … })
 *   hat.setVisible(false); hat.destroy();
 *
 * The SVG in ./assets/christmas-hat.svg is the original design (one colour updated: #EDF0F2 → #DEE6EB).
 */
import { createHeadAccessory } from '../../core/headAccessory.js';
import CHRISTMAS_HAT_SVG from './assets/christmas-hat.svg?raw';
import { createChristmasHatMotion, CHRISTMAS_HAT_MOTION } from './christmasHatMotion.js';

export { CHRISTMAS_HAT_SVG, CHRISTMAS_HAT_MOTION };

/**
 * Placement measured on the two reference images (tools/fit_placement.py):
 * the hat's SVG origin in the dog's 240×240 frame, and its rotation, in each pose.
 * Scale 1 — the hat keeps its own size (133 × 98).
 */
export const CHRISTMAS_HAT_PLACEMENT = {
  scale: 1,
  pose1: { x: 72.32, y: 0.0, rotate: 0 },
  pose2: { x: 88.62, y: 35.56, rotate: 23.18 }
};

export function createChristmasHat(svg, options = {}) {
  return createHeadAccessory(svg, {
    name: 'christmas-hat',
    markup: CHRISTMAS_HAT_SVG,
    placement: { ...CHRISTMAS_HAT_PLACEMENT, ...(options.placement || {}) },
    // secondary motion: tip sway, breathing, bounce on pose change (`motion: false` turns it off)
    motion: options.motion === false ? null : createChristmasHatMotion({ ...CHRISTMAS_HAT_MOTION, ...(options.motion || {}) }),
    pose: options.pose,
    time: options.time
  });
}
