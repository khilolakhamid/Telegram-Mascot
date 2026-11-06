/**
 * Glasses accessory for the telegram-mascot dog — worn on the eyes.
 *
 *   import { createGlasses } from '../accessories/eyes/glasses';
 *   const glasses = createGlasses(dogSvg);   // after the dog is drawn into dogSvg
 *   glasses.update(info);                    // in the dog's onFrame ({ time, pose, … })
 *   glasses.setVisible(false); glasses.destroy();
 *
 * The SVG in ./assets/glasses.svg is the approved design (the updated version), used as is:
 * frames, lenses, the lens highlights and the shadow are not changed. The glasses are drawn over the head and ears and follow
 * the head exactly (head turn, breathing, both poses and the transitions). On top of that a quick
 * glint of light sweeps across the lenses now and then, and the glasses rock a little on the nose
 * when the dog changes pose (glassesMotion.js).
 */
import { createHeadAccessory } from '../../core/headAccessory.js';
import GLASSES_SVG from './assets/glasses.svg?raw';
import { createGlassesMotion, GLASSES_MOTION } from './glassesMotion.js';

export { GLASSES_SVG, GLASSES_MOTION };

/**
 * Placement measured on the two reference images (tools/fit_placement.py … glasses; the dog's eyes
 * are hidden by the lenses there, so the screenshots are matched by the dog's outline and nose):
 * the glasses' SVG origin in the dog's 240×240 frame, and their rotation, in each pose.
 * Scale 1 — the glasses keep their own size (111 × 63).
 */
export const GLASSES_PLACEMENT = {
  scale: 1,
  pose1: { x: 47.87, y: 49.01, rotate: -0.02 },
  pose2: { x: 44.52, y: 75.27, rotate: 15.13 }
};

export function createGlasses(svg, options = {}) {
  return createHeadAccessory(svg, {
    name: 'glasses',
    markup: GLASSES_SVG,
    layer: 'over-head',
    placement: { ...GLASSES_PLACEMENT, ...(options.placement || {}) },
    // its own motion: lens glint, rocking on pose change (`motion: false` turns it off)
    motion: options.motion === false ? null : createGlassesMotion({ ...GLASSES_MOTION, ...(options.motion || {}) }),
    pose: options.pose,
    time: options.time
  });
}
