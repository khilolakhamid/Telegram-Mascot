import { ChristmasHat } from '../../accessories/head/christmas-hat';
import { Bow } from '../../accessories/head/bow';
import { Duck } from '../../accessories/head/duck';
import { Cheese } from '../../accessories/head/cheese';
import { Carrot } from '../../accessories/mouth/carrot';
import { Ball } from '../../accessories/mouth/ball';
import { Glasses } from '../../accessories/eyes/glasses';
import { PinkGlasses } from '../../accessories/eyes/pink-glasses';

// Wearable accessories (real components from ../../accessories, unchanged), by id, listed from the
// innermost wrapper to the outermost, as in accessories/README.md: the Christmas hat goes outside.
// Each wraps the dog and is switched on with `enabled`; the set is fixed, so the dog is never
// remounted when accessories are put on or taken off. A new wearable is added here and in
// data/accessories.js.
export const WEARABLES = {
  ball: Ball,
  carrot: Carrot,
  'pink-glasses': PinkGlasses,
  glasses: Glasses,
  bow: Bow,
  cheese: Cheese,
  duck: Duck,
  'christmas-hat': ChristmasHat
};

/**
 * The dog wearing the accessories in `worn` (a list of accessory ids).
 *   <WornDog worn={['christmas-hat', 'carrot']}><DogMascot size={100} /></WornDog>
 * `fill` makes the wrappers fill their box (for a dog sized in %).
 * Give it `key={skin}`: when the dog's model changes, the accessories are created afresh on the new
 * model (an accessory keeps track of the drawing it was put on).
 */
export default function WornDog({ worn = [], fill = false, children }) {
  const style = fill ? { display: 'block', width: '100%', height: '100%' } : undefined;
  return Object.entries(WEARABLES).reduce(
    (dog, [id, Wearable]) => <Wearable enabled={worn.includes(id)} style={style}>{dog}</Wearable>,
    children
  );
}
