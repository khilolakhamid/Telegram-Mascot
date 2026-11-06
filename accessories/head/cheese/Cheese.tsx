import {
  cloneElement, forwardRef, isValidElement, useCallback, useEffect, useRef, version as reactVersion,
  type CSSProperties, type MutableRefObject, type ReactElement, type Ref
} from 'react';
import { poseAt } from '../../../mascot/animations/dogAnimation.js';
import { createCheese } from './cheese.js';

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

export interface CheeseProps {
  /** The mascot the cheese lies on: a single `<DogMascot … />` element. */
  children: ReactElement;
  /** Show the cheese (default true). false — the dog is shown exactly as without the accessory. */
  enabled?: boolean;
  /** Its own motion: breathing, rocking on pose change (default true). */
  motion?: boolean;
  /**
   * Frames of the dog, for an accessory wrapped around this one, e.g.
   * <Cheese><Bone><DogMascot /></Bone></Cheese>. Usually not set by hand.
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
 * Cheese lying on the dog's head — a separate accessory, put on the dog from outside.
 *
 *   import { DogMascot } from '../mascot/index.js';
 *   import { Cheese } from '../accessories/head/cheese';
 *
 *   <Cheese>
 *     <DogMascot size={240} />
 *   </Cheese>
 *
 *   <Cheese enabled={false}> … </Cheese>   // cheese off
 *   <Cheese motion={false}> … </Cheese>    // no motion of its own, only follows the head
 *
 * With a mouth accessory: <Cheese><Bone><DogMascot /></Bone></Cheese>.
 *
 * The dog component is not changed: the cheese wraps it, listens to its frames (your own `onFrame`
 * and `ref` on DogMascot keep working) and draws itself in the dog's head group, over the head, so
 * it follows the head turn, breathing and both poses; it breathes and rocks a little when the dog
 * changes pose, always around the point where it lies, so it never lifts off.
 */
export const Cheese = forwardRef<MascotController, CheeseProps>(function Cheese(
  { children, enabled = true, motion = true, onFrame: outerOnFrame, className, style }, outerRef
) {
  if (!isValidElement(children)) throw new Error('Cheese: pass one <DogMascot /> as its child');

  const wrapRef = useRef<HTMLSpanElement>(null);
  const dogRef = useRef<MascotController | null>(null);
  const cheeseRef = useRef<AccessoryController | null>(null);
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
    return createCheese(svg, { pose, time, motion: motion ? undefined : false }) as AccessoryController;
  }, [motion]);

  // Put the cheese on / take it off. The dog draws itself in its own (child) effect, which runs first.
  useEffect(() => {
    if (!enabled) return undefined;
    const time = dogRef.current ? dogRef.current.getTime() : 0;
    const cheese = putOn(poseAt(time), time);
    cheeseRef.current = cheese;
    return () => { if (cheese) cheese.destroy(); cheeseRef.current = null; };
  }, [enabled, putOn]);

  const onFrame = useCallback((info: MascotFrameInfo) => {
    const cheese = cheeseRef.current;
    if (cheese) {
      if (!cheese.isAttached()) {   // the dog was rebuilt (e.g. remount) — put the cheese back
        cheese.destroy();
        cheeseRef.current = putOn(info.pose, info.time);
      } else cheese.update(info);
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

export default Cheese;
