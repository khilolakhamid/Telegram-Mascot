import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createDogAnimation } from '../animations/dogAnimation.js';

/**
 * Animated PawMotion dog.
 *
 *   <DogMascot />                         240 × 240, plays the 12-second cycle forever
 *   <DogMascot size={120} />              scaled down proportionally (lines scale too)
 *   <DogMascot playing={false} />         controlled play/pause
 *   const ref = useRef(); <DogMascot ref={ref} />; ref.current.pause();
 *
 * Props:
 *   size      number | string   side of the square component (default 240)
 *   playing   boolean           play (true, default) or pause
 *   startTime number            seconds into the 12-second sequence to start from
 *   onFrame   function          ({ time, blockIndex, block, stage, pose }) on every drawn frame
 *   className, style, title     passed to the outer element
 *
 * Ref methods: play(), pause(), seek(seconds), isPlaying(), getTime(), duration
 */
const DogMascot = forwardRef(function DogMascot(
  { size = 240, playing = true, startTime = 0, onFrame, className, style, title = 'Dog mascot' },
  ref
) {
  const svgRef = useRef(null);
  const dogRef = useRef(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    const dog = createDogAnimation(svgRef.current, {
      autoPlay: false,
      startTime,
      onFrame: info => onFrameRef.current && onFrameRef.current(info)
    });
    dogRef.current = dog;
    return () => { dog.destroy(); dogRef.current = null; };
    // the animation is built once per mount; later changes go through play/pause/seek
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const dog = dogRef.current;
    if (!dog) return;
    if (playing) dog.play(); else dog.pause();
  }, [playing]);

  useImperativeHandle(ref, () => ({
    play: () => dogRef.current && dogRef.current.play(),
    pause: () => dogRef.current && dogRef.current.pause(),
    seek: t => dogRef.current && dogRef.current.seek(t),
    isPlaying: () => !!dogRef.current && dogRef.current.isPlaying(),
    getTime: () => (dogRef.current ? dogRef.current.getTime() : 0),
    get duration() { return dogRef.current ? dogRef.current.duration : 12; }
  }), []);

  const side = typeof size === 'number' ? `${size}px` : size;
  return (
    <div className={className} style={{ width: side, height: side, display: 'inline-block', ...style }}>
      <svg
        ref={svgRef}
        viewBox="0 0 240 240"
        width="100%"
        height="100%"
        fill="none"
        role="img"
        aria-label={title}
        style={{ display: 'block' }}
      />
    </div>
  );
});

export default DogMascot;
