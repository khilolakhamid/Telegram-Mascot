import {
  cloneElement, isValidElement, useCallback, useEffect, useRef, version as reactVersion,
  type CSSProperties, type MutableRefObject, type ReactElement, type Ref
} from 'react';
import { poseAt } from '../../../mascot/animations/dogAnimation.js';
import { createChristmasHat } from './christmasHat.js';

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

export interface ChristmasHatProps {
  /** The mascot to put the hat on: a single `<DogMascot … />` element. */
  children: ReactElement;
  /** Wear the hat (default true). false — the dog is shown exactly as without the accessory. */
  enabled?: boolean;
  /** Fabric motion: tip sway, breathing, bounce and landing hop (default true). */
  motion?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface HatController {
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
 * Christmas hat for the Telegram Mascot dog — a separate accessory, put on the dog from outside.
 *
 *   import { DogMascot } from '../mascot/index.js';
 *   import { ChristmasHat } from '../accessories/head/christmas-hat';
 *
 *   <ChristmasHat>
 *     <DogMascot size={240} />
 *   </ChristmasHat>
 *
 *   <ChristmasHat enabled={false}> … </ChristmasHat>   // hat off
 *
 * The dog component is not changed: the hat wraps it, listens to its frames (your own `onFrame`
 * and `ref` on DogMascot keep working) and draws itself in the dog's head group, so it follows the
 * head turn, breathing and both poses, with its own fabric motion on top.
 */
export function ChristmasHat({ children, enabled = true, motion = true, className, style }: ChristmasHatProps) {
  if (!isValidElement(children)) throw new Error('ChristmasHat: pass one <DogMascot /> as its child');

  const wrapRef = useRef<HTMLSpanElement>(null);
  const dogRef = useRef<MascotController | null>(null);
  const hatRef = useRef<HatController | null>(null);
  const child = children as ReactElement<ChildProps & { ref?: Ref<MascotController> }> & { ref?: Ref<MascotController> };
  const childOnFrame = useRef(child.props.onFrame);
  childOnFrame.current = child.props.onFrame;
  // the dog's own ref, if you set one (React 19 keeps it in props, React 18 on the element)
  const childRef = parseInt(reactVersion, 10) >= 19 ? child.props.ref : child.ref;

  const putOn = useCallback((pose: number, time: number): HatController | null => {
    const svg = wrapRef.current?.querySelector('svg');
    if (!svg) return null;
    return createChristmasHat(svg, { pose, time, motion: motion ? undefined : false }) as HatController;
  }, [motion]);

  // Put the hat on / take it off. The dog draws itself in its own (child) effect, which runs first.
  useEffect(() => {
    if (!enabled) return undefined;
    const time = dogRef.current ? dogRef.current.getTime() : 0;
    const hat = putOn(poseAt(time), time);
    hatRef.current = hat;
    return () => { if (hat) hat.destroy(); hatRef.current = null; };
  }, [enabled, putOn]);

  const onFrame = useCallback((info: MascotFrameInfo) => {
    const hat = hatRef.current;
    if (hat) {
      if (!hat.isAttached()) {   // the dog was rebuilt (e.g. remount) — put the hat back on
        hat.destroy();
        hatRef.current = putOn(info.pose, info.time);
      } else hat.update(info);
    }
    if (childOnFrame.current) childOnFrame.current(info);
  }, [putOn]);

  const setDogRef = useCallback((value: MascotController | null) => {
    dogRef.current = value;
    assignRef(childRef, value);
  }, [childRef]);

  return (
    <span ref={wrapRef} className={className} style={{ display: 'inline-block', lineHeight: 0, ...style }}>
      {cloneElement(child, { onFrame, ref: setDogRef } as ChildProps & { ref: Ref<MascotController> })}
    </span>
  );
}

export default ChristmasHat;
