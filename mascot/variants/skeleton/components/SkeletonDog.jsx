import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createSkeletonAnimation } from '../animations/skeletonAnimation.js';

/**
 * Animated Skeleton Dog — a separate skin of the mascot with the same behaviour as the Original Dog.
 *
 *   <SkeletonDog />                       240 × 240, plays the 12-second cycle forever
 *   <SkeletonDog size={120} />            scaled down proportionally (lines and glows scale too)
 *   <SkeletonDog playing={false} />       controlled play/pause
 *   const ref = useRef(); <SkeletonDog ref={ref} />; ref.current.seek(9.3);
 *
 * Props and ref methods are the same as DogMascot, so the two skins are interchangeable:
 *   size, playing, startTime, onFrame, className, style, title
 *   play(), pause(), seek(seconds), isPlaying(), getTime(), duration
 */
const SkeletonDog = forwardRef(function SkeletonDog(
  { size = 240, playing = true, startTime = 0, onFrame, className, style, title = 'Skeleton dog mascot' },
  ref
) {
  const svgRef = useRef(null);
  const dogRef = useRef(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    const dog = createSkeletonAnimation(svgRef.current, {
      autoPlay: false,
      startTime,
      onFrame: info => onFrameRef.current && onFrameRef.current(info)
    });
    dogRef.current = dog;
    return () => { dog.destroy(); dogRef.current = null; };
    // built once per mount; later changes go through play/pause/seek
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
      <svg ref={svgRef} viewBox="0 0 240 240" width="100%" height="100%" fill="none" role="img" aria-label={title}
           style={{ display: 'block', overflow: 'visible' }} />
    </div>
  );
});

export default SkeletonDog;
