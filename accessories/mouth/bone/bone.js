/**
 * Bone accessory for the Telegram Mascot dog — held in the mouth.
 *
 *   import { createBone } from '../accessories/mouth/bone';
 *   const bone = createBone(dogSvg);         // after the dog is drawn into dogSvg
 *   bone.update(info);                       // in the dog's onFrame ({ time, pose, … })
 *   bone.setVisible(false); bone.destroy();
 *
 * The SVG in ./assets/bone.svg is the original design, used as is (only placed and moved).
 * The bone is drawn under the dog's head and ears and over the body and legs, so the muzzle
 * overlaps the middle of the bone: the dog holds it in the mouth. It follows the head exactly (head
 * turn, breathing, both poses and the transitions); on top of that it breathes and rocks a little in
 * the mouth when the dog changes pose (boneMotion.js).
 */
import { createHeadAccessory } from '../../core/headAccessory.js';
import BONE_SVG from './assets/bone.svg?raw';
import { createBoneMotion, BONE_MOTION } from './boneMotion.js';

export { BONE_SVG, BONE_MOTION };

/**
 * Placement measured on the two reference images (tools/fit_placement.py … bone):
 * the bone's SVG origin in the dog's 240×240 frame, and its rotation, in each pose.
 * Scale 1 — the bone keeps its own size (104 × 35).
 */
export const BONE_PLACEMENT = {
  scale: 1,
  pose1: { x: 49.12, y: 128.08, rotate: -0.04 },
  pose2: { x: 25.17, y: 143.66, rotate: 18.96 }
};

export function createBone(svg, options = {}) {
  return createHeadAccessory(svg, {
    name: 'bone',
    markup: BONE_SVG,
    layer: 'under-head',
    placement: { ...BONE_PLACEMENT, ...(options.placement || {}) },
    // its own motion: breathing, rocking on pose change (`motion: false` turns it off)
    motion: options.motion === false ? null : createBoneMotion({ ...BONE_MOTION, ...(options.motion || {}) }),
    pose: options.pose,
    time: options.time
  });
}
