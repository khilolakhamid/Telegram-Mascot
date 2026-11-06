import { useLayoutEffect } from 'react';

// One timeline for every dog on the screen (profile avatar and the Dog shop).
// The clock starts once, when the page loads, and is never reset by screens, accessories or skins:
// a dog that appears (new skin, the shop opening) starts at the clock's current moment, and a dog
// that keeps running is gently held to it. Speed and timings of the animations are not touched —
// the dogs still run their own 12-second cycle; the clock only says *where* in it they are.
const CYCLE = 12;   // seconds, the length of the dog's sequence (mascot/animations/dogAnimation.js)
const T0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Current moment of the shared timeline, in seconds within the cycle. */
export function mascotTime(duration = CYCLE) {
  return ((now() - T0) / 1000) % duration;
}

// Dogs on screen that follow the clock. They are always put on the clock together, to the very same
// moment, so after that they step in the same frames with the same steps and look identical.
// Corrections are tiny (about a frame) in normal play; a bigger one only follows a long stall
// (a hidden tab), since the dog itself caps one frame step at 0.1 s.
const dogs = new Set();
let timer = 0;

function syncAll() {
  const target = mascotTime();
  for (const ref of dogs) {
    const dog = ref.current;
    if (dog && typeof dog.seek === 'function') dog.seek(target % (dog.duration || CYCLE));
  }
}
function onVisible() { if (!document.hidden) syncAll(); }

/**
 * Keeps the dog behind `ref` (DogMascot / SkeletonDog / UFODog controller) on the shared timeline
 * while `playing`: at once (e.g. the shop opens again), twice a second, and when the page is shown again.
 * Mount the dog with `startTime={mascotTime()}` so it begins at the right moment too.
 */
export function useMascotClock(ref, playing = true) {
  useLayoutEffect(() => {
    if (!playing) return undefined;
    dogs.add(ref);
    if (dogs.size === 1) {
      timer = setInterval(syncAll, 500);
      document.addEventListener('visibilitychange', onVisible);
    }
    syncAll();
    return () => {
      dogs.delete(ref);
      if (dogs.size === 0) {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, [ref, playing]);
}
