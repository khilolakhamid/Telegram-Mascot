import {
  cloneElement, forwardRef, isValidElement, useCallback, useEffect, useRef, version as reactVersion,
  type CSSProperties, type MutableRefObject, type ReactElement, type Ref
} from 'react';
import { poseAt } from '../../../mascot/animations/dogAnimation.js';
import { createCarrot } from './carrot.js';

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

export interface CarrotProps {
  /** The mascot that holds the carrot: a single `<DogMascot … />` element. */
  children: ReactElement;
  /** Show the carrot (default true). false — the dog is shown exactly as without the accessory. */
  enabled?: boolean;
  /** Its own motion: leaf sway, breathing, shake on pose change (default true). */
  motion?: boolean;
  /**
   * Frames of the dog, for an accessory wrapped around this one, e.g.
   * <ChristmasHat><Carrot><DogMascot /></Carrot></ChristmasHat>. Usually not set by hand.
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
 * Carrot in the dog's mouth — a separate accessory, put on the dog from outside.
 *
 *   import { DogMascot } from '../mascot/index.js';
 *   import { Carrot } from '../accessories/mouth/carrot';
 *
 *   <Carrot>
 *     <DogMascot size={240} />
 *   </Carrot>
 *
 *   <Carrot enabled={false}> … </Carrot>   // carrot off
 *   <Carrot motion={false}> … </Carrot>    // no motion of its own, only follows the head
 *
 * With the Christmas hat: <ChristmasHat><Carrot><DogMascot /></Carrot></ChristmasHat>.
 *
 * The dog component is not changed: the carrot wraps it, listens to its frames (your own `onFrame`
 * and `ref` on DogMascot keep working) and draws itself in the dog's head group, under the head,
 * so it follows the head turn, breathing and both poses, and the muzzle overlaps it; its leaves
 * sway, the root breathes and the leaves shake when the dog changes pose.
 */
export const Carrot = forwardRef<MascotController, CarrotProps>(function Carrot(
  { children, enabled = true, motion = true, onFrame: outerOnFrame, className, style }, outerRef
) {
  if (!isValidElement(children)) throw new Error('Carrot: pass one <DogMascot /> as its child');

  const wrapRef = useRef<HTMLSpanElement>(null);
  const dogRef = useRef<MascotController | null>(null);
  const carrotRef = useRef<AccessoryController | null>(null);
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
    return createCarrot(svg, { pose, time, motion: motion ? undefined : false }) as AccessoryController;
  }, [motion]);

  // Put the carrot in / take it out. The dog draws itself in its own (child) effect, which runs first.
  useEffect(() => {
    if (!enabled) return undefined;
    const time = dogRef.current ? dogRef.current.getTime() : 0;
    const carrot = putOn(poseAt(time), time);
    carrotRef.current = carrot;
    return () => { if (carrot) carrot.destroy(); carrotRef.current = null; };
  }, [enabled, putOn]);

  const onFrame = useCallback((info: MascotFrameInfo) => {
    const carrot = carrotRef.current;
    if (carrot) {
      if (!carrot.isAttached()) {   // the dog was rebuilt (e.g. remount) — put the carrot back
        carrot.destroy();
        carrotRef.current = putOn(info.pose, info.time);
      } else carrot.update(info);
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

export default Carrot;
