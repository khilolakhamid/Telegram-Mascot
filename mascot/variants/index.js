// Mascot skins. Switching a skin changes only the visual model; behaviour and timing are the same.
import { DogMascot, createDogAnimation } from '../index.js';
import { SkeletonDog, createSkeletonAnimation } from './skeleton/index.js';
import { UFODog, createUFOAnimation } from './ufo/index.js';

export const SKINS = {
  original: { name: 'Original Dog', Component: DogMascot, create: createDogAnimation },
  skeleton: { name: 'Skeleton Dog', Component: SkeletonDog, create: createSkeletonAnimation },
  ufo: { name: 'UFO Dog', Component: UFODog, create: createUFOAnimation }
};
export const DEFAULT_SKIN = 'original';
