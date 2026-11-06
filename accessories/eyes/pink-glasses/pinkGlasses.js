/**
 * Pink glasses accessory for the telegram-mascot dog — worn on the eyes.
 *
 *   import { createPinkGlasses } from '../accessories/eyes/pink-glasses';
 *   const glasses = createPinkGlasses(dogSvg);   // after the dog is drawn into dogSvg
 *   glasses.update(info);                        // in the dog's onFrame ({ time, pose, … })
 *   glasses.setVisible(false); glasses.destroy();
 *
 * Built on the green glasses (../glasses): the same engine, the same motion with the same timings
 * (pinkGlassesMotion.js), only the drawing and the placement are their own. The SVG in
 * ./assets/pink-glasses.svg is used as is. The glasses are drawn over the head and ears and follow
 * the head exactly (head turn, breathing, both poses and the transitions); a quick glint of light
 * sweeps across the lenses now and then, and they rock a little on the nose when the dog changes pose.
 */
import { createHeadAccessory } from '../../core/headAccessory.js';
import PINK_GLASSES_SVG from './assets/pink-glasses.svg?raw';
import { createPinkGlassesMotion, PINK_GLASSES_MOTION } from './pinkGlassesMotion.js';

export { PINK_GLASSES_SVG, PINK_GLASSES_MOTION };

/**
 * Placement measured on the two reference images (tools/fit_placement.py … pink-glasses; the dog's
 * eyes are hidden by the lenses there, so the screenshots are matched by the dog's outline and nose):
 * the glasses' SVG origin in the dog's 240×240 frame, and their rotation, in each pose.
 * Scale 1 — the glasses keep their own size (113 × 61).
 */
export const PINK_GLASSES_PLACEMENT = {
  scale: 1,
  pose1: { x: 42.62, y: 50.59, rotate: -0.02 },
  pose2: { x: 44.73, y: 75.86, rotate: 19.96 }
};

export function createPinkGlasses(svg, options = {}) {
  return createHeadAccessory(svg, {
    name: 'pink-glasses',
    markup: PINK_GLASSES_SVG,
    layer: 'over-head',
    placement: { ...PINK_GLASSES_PLACEMENT, ...(options.placement || {}) },
    // its own motion: lens glint, rocking on pose change (`motion: false` turns it off)
    motion: options.motion === false ? null : createPinkGlassesMotion({ ...PINK_GLASSES_MOTION, ...(options.motion || {}) }),
    pose: options.pose,
    time: options.time
  });
}
