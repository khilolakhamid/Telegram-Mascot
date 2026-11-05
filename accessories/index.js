// Public entry of the accessories. The dog itself comes from ../mascot and is not modified.
// Each accessory can also be imported on its own from its folder, e.g. ./head/christmas-hat.

// Head accessories
export {
  ChristmasHat, createChristmasHat, createChristmasHatMotion,
  CHRISTMAS_HAT_PLACEMENT, CHRISTMAS_HAT_SVG, CHRISTMAS_HAT_MOTION
} from './head/christmas-hat/index.ts';

// Mouth accessories
export { Carrot, createCarrot, CARROT_PLACEMENT, CARROT_SVG } from './mouth/carrot/index.ts';

// Shared engine for building new accessories
export { createHeadAccessory } from './core/headAccessory.js';
export { buildInertia } from './core/inertia.js';
export { parsePath, buildPath } from './core/pathDeform.js';
