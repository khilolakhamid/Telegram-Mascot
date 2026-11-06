// Dog skins (whole visual models of the mascot), from the skins registry in ../../mascot/variants.
// Original Dog is the free default model; the other skins are sold in the shop (data/accessories.js).
// Switching a skin changes only the look — behaviour and timing are shared.
import { SKINS, DEFAULT_SKIN } from '../../mascot/variants/index.js';

export { DEFAULT_SKIN };

export const SKIN_LIST = Object.entries(SKINS).map(([id, skin]) => ({ id, name: skin.name, Component: skin.Component }));

export const skinById = id => SKIN_LIST.find(s => s.id === id) || SKIN_LIST.find(s => s.id === DEFAULT_SKIN);
