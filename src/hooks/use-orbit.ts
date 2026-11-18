import { useEffect, useRef, type RefObject } from 'react';
import {
  isOrbitResting,
  orbitSegments,
  restingOrbit,
  stepOrbit,
  type OrbitProfile,
  type OrbitState,
} from '@/utils/orbit-physics';

const MAX_FRAME_SECONDS = 0.05;

interface UseOrbitOptions {
  /** Animate only while the arc is on screen. Turning it off drops the arc back to the bottom. */
  enabled: boolean;
  running: boolean;
  profile: OrbitProfile;
}

/** Moves the segment paths of the Free run arc each frame, without re-rendering the card. */
export function useOrbit(
  paths: RefObject<(SVGPathElement | null)[]>,
  { enabled, running, profile }: UseOrbitOptions
) {
  const orbit = useRef<{ profile: OrbitProfile; state: OrbitState } | null>(null);

  useEffect(() => {
    if (!enabled) {
      orbit.current = null;
      return;
    }
    if (orbit.current?.profile !== profile) {
      orbit.current = { profile, state: restingOrbit(profile) };
    }
    const current = orbit.current;
    let frame = 0;
    let previousTime: number | null = null;

    function paint() {
      orbitSegments(current.state).forEach((segment, index) => {
        const path = paths.current[index];
        path?.setAttribute(
          'stroke-dasharray',
          `${segment.length.toFixed(3)} ${(100 - segment.length).toFixed(3)}`
        );
        path?.setAttribute('stroke-dashoffset', (-segment.start).toFixed(3));
      });
    }

    function tick(time: number) {
      const seconds =
        previousTime === null ? 0 : Math.min((time - previousTime) / 1000, MAX_FRAME_SECONDS);
      previousTime = time;
      current.state = stepOrbit(current.state, seconds, running, profile);
      paint();
      frame = running || !isOrbitResting(current.state) ? requestAnimationFrame(tick) : 0;
    }

    paint();
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled, running, profile, paths]);
}
