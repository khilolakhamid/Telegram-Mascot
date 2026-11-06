import {
  cloneElement, forwardRef, isValidElement, useCallback, useEffect, useRef, version as reactVersion,
  type CSSProperties, type MutableRefObject, type ReactElement, type Ref
} from 'react';
import { poseAt } from '../../../mascot/animations/dogAnimation.js';
import { createPinkGlasses } from './pinkGlasses.js';

/** Frame info the mascot passes to `onFrame` (see mascot/README.md). */
export interface MascotFrameInfo {
  time: number;
  blockIndex: number;
  block: string;
  stage: string;
  pose: number;
}

/** Controller exposed by `<DogMascot ref>`. */
export interface MascotController {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  isPlaying(): boolean;
  getTime(): number;
  readonly duration: number;
}

export interface PinkGlassesProps {
  /** The mascot that wears the glasses: a single `<DogMascot … />` element. */
  children: ReactElement;
  /** Show the glasses (default true). false — the dog is shown exactly as without the accessory. */
  enabled?: boolean;
  /** Their own motion: lens glint, rocking on pose change (default true). */
  motion?: boolean;
  /**
   * Frames of the dog, for an accessory wrapped around this one, e.g.
   * <PinkGlasses><Ball><DogMascot /></Ball></PinkGlasses>. Usually not set by hand.
   */
  onFrame?: (info: MascotFrameInfo) => void;
  className?: string;
  style?: CSSProperties;
}

interface AccessoryController {
  update(info: MascotFrameInfo | number): void;
  setVisible(visible: boolean): void;
  isAttached(): boolean;
  destroy(): void;
}

type ChildProps = { onFrame?: (info: MascotFrameInfo) => void };

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as MutableRefObject<T | null>).current = value;
}

/**
 * Pink glasses on the dog's eyes — a separate accessory, put on the dog from outside.
 *
 *   import { DogMascot } from '../mascot/index.js';
 *   import { PinkGlasses } from '../accessories/eyes/pink-glasses';
 *
 *   <PinkGlasses>
 *     <DogMascot size={240} />
 *   </PinkGlasses>
 *
 *   <PinkGlasses enabled={false}> … </PinkGlasses>   // glasses off
 *   <PinkGlasses motion={false}> … </PinkGlasses>    // no glint or rocking, only follows the head
 *
 * With other accessories: <Duck><PinkGlasses><Ball><DogMascot /></Ball></PinkGlasses></Duck>.
 * The same motion as the green glasses (Glasses), with the same timings.
 *
 * The dog component is not changed: the glasses wrap it, listen to its frames (your own `onFrame`
 * and `ref` on DogMascot keep working) and draw themselves in the dog's head group, over the head,
 * so they follow the head turn, breathing and both poses; a glint of light sweeps across the lenses
 * now and then, and they rock a little on the nose when the dog changes pose.
 */
export const PinkGlasses = forwardRef<MascotController, PinkGlassesProps>(function PinkGlasses(
  { children, enabled = true, motion = true, onFrame: outerOnFrame, className, style }, outerRef
) {
  if (!isValidElement(children)) throw new Error('PinkGlasses: pass one <DogMascot /> as its child');

  const wrapRef = useRef<HTMLSpanElement>(null);
  const dogRef = useRef<MascotController | null>(null);
  const glassesRef = useRef<AccessoryController | null>(null);
  const child = children as ReactElement<ChildProps & { ref?: Ref<MascotController> }> & { ref?: Ref<MascotController> };
  const childOnFrame = useRef(child.props.onFrame);
  childOnFrame.current = child.props.onFrame;
  const outerOnFrameRef = useRef(outerOnFrame);
  outerOnFrameRef.current = outerOnFrame;
  // the dog's own ref, if you set one (React 19 keeps it in props, React 18 on the element)
  const childRef = parseInt(reactVersion, 10) >= 19 ? child.props.ref : child.ref;

  const putOn = useCallback((pose: number, time: number): AccessoryController | null => {
    const svg = wrapRef.current?.querySelector('svg');
    if (!svg) return null;
    return createPinkGlasses(svg, { pose, time, motion: motion ? undefined : false }) as AccessoryController;
  }, [motion]);

  // Put the glasses on / take them off. The dog draws itself in its own (child) effect, which runs first.
  useEffect(() => {
    if (!enabled) return undefined;
    const time = dogRef.current ? dogRef.current.getTime() : 0;
    const glasses = putOn(poseAt(time), time);
    glassesRef.current = glasses;
    return () => { if (glasses) glasses.destroy(); glassesRef.current = null; };
  }, [enabled, putOn]);

  const onFrame = useCallback((info: MascotFrameInfo) => {
    const glasses = glassesRef.current;
    if (glasses) {
      if (!glasses.isAttached()) {   // the dog was rebuilt (e.g. remount) — put the glasses back
        glasses.destroy();
        glassesRef.current = putOn(info.pose, info.time);
      } else glasses.update(info);
    }
    if (childOnFrame.current) childOnFrame.current(info);
    if (outerOnFrameRef.current) outerOnFrameRef.current(info);
  }, [putOn]);

  const setDogRef = useCallback((value: MascotController | null) => {
    dogRef.current = value;
    assignRef(childRef, value);
    assignRef(outerRef, value);
  }, [childRef, outerRef]);

  return (
    <span ref={wrapRef} className={className} style={{ display: 'inline-block', lineHeight: 0, ...style }}>
      {cloneElement(child, { onFrame, ref: setDogRef } as ChildProps & { ref: Ref<MascotController> })}
    </span>
  );
});

export default PinkGlasses;
