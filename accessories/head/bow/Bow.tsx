import {
  cloneElement, forwardRef, isValidElement, useCallback, useEffect, useRef, version as reactVersion,
  type CSSProperties, type MutableRefObject, type ReactElement, type Ref
} from 'react';
import { poseAt } from '../../../mascot/animations/dogAnimation.js';
import { createBow } from './bow.js';

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

export interface BowProps {
  /** The mascot that wears the bow: a single `<DogMascot … />` element. */
  children: ReactElement;
  /** Show the bow (default true). false — the dog is shown exactly as without the accessory. */
  enabled?: boolean;
  /** Its own motion: soft sway of the loops, shake on pose change (default true). */
  motion?: boolean;
  /**
   * Frames of the dog, for an accessory wrapped around this one, e.g.
   * <Bow><Carrot><DogMascot /></Carrot></Bow>. Usually not set by hand.
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
 * Bow on the dog's head — a separate accessory, put on the dog from outside.
 *
 *   import { DogMascot } from '../mascot/index.js';
 *   import { Bow } from '../accessories/head/bow';
 *
 *   <Bow>
 *     <DogMascot size={240} />
 *   </Bow>
 *
 *   <Bow enabled={false}> … </Bow>   // bow off
 *   <Bow motion={false}> … </Bow>    // no motion of its own, only follows the head
 *
 * With the carrot: <Bow><Carrot><DogMascot /></Carrot></Bow>.
 *
 * The dog component is not changed: the bow wraps it, listens to its frames (your own `onFrame`
 * and `ref` on DogMascot keep working) and draws itself in the dog's head group, over the head, so
 * it follows the head turn, breathing and both poses; its loops sway softly and shake when the dog
 * changes pose, the knot stays on the head.
 */
export const Bow = forwardRef<MascotController, BowProps>(function Bow(
  { children, enabled = true, motion = true, onFrame: outerOnFrame, className, style }, outerRef
) {
  if (!isValidElement(children)) throw new Error('Bow: pass one <DogMascot /> as its child');

  const wrapRef = useRef<HTMLSpanElement>(null);
  const dogRef = useRef<MascotController | null>(null);
  const bowRef = useRef<AccessoryController | null>(null);
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
    return createBow(svg, { pose, time, motion: motion ? undefined : false }) as AccessoryController;
  }, [motion]);

  // Put the bow on / take it off. The dog draws itself in its own (child) effect, which runs first.
  useEffect(() => {
    if (!enabled) return undefined;
    const time = dogRef.current ? dogRef.current.getTime() : 0;
    const bow = putOn(poseAt(time), time);
    bowRef.current = bow;
    return () => { if (bow) bow.destroy(); bowRef.current = null; };
  }, [enabled, putOn]);

  const onFrame = useCallback((info: MascotFrameInfo) => {
    const bow = bowRef.current;
    if (bow) {
      if (!bow.isAttached()) {   // the dog was rebuilt (e.g. remount) — put the bow back
        bow.destroy();
        bowRef.current = putOn(info.pose, info.time);
      } else bow.update(info);
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

export default Bow;
