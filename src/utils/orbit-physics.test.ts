import { describe, expect, it } from 'vitest';
import { TIMER_SHAPES } from '@/components/features/focus-shapes';
import {
  ORBIT_REST_LENGTH,
  buildOrbitProfile,
  isOrbitResting,
  orbitSegments,
  restingOrbit,
  stepOrbit,
  type OrbitProfile,
  type OrbitState,
} from './orbit-physics';

const FRAME = 1 / 60;
const squircle = TIMER_SHAPES.find((shape) => shape.id === 'squircle')!;

function simulate(
  profile: OrbitProfile,
  start: OrbitState,
  seconds: number,
  running: boolean,
  onFrame?: (state: OrbitState) => void
): OrbitState {
  let state = start;
  for (let frame = 0; frame < seconds / FRAME; frame++) {
    state = stepOrbit(state, FRAME, running, profile);
    onFrame?.(state);
  }
  return state;
}

describe('buildOrbitProfile', () => {
  it('should find the lowest point of the ring and rate the top as -1 and the bottom as 1', () => {
    const profile = buildOrbitProfile(squircle.path);

    expect(profile.bottom).toBeGreaterThan(48);
    expect(profile.bottom).toBeLessThan(52);
    expect(profile.heights[0]).toBeCloseTo(-1, 1);
    expect(Math.max(...profile.heights)).toBeCloseTo(1);
  });
});

describe('stepOrbit while running', () => {
  const profile = buildOrbitProfile(squircle.path);

  it('should roll faster near the bottom of the ring than near the top', () => {
    const lowSpeeds: number[] = [];
    const highSpeeds: number[] = [];
    simulate(profile, restingOrbit(profile), 80, true, (state) => {
      if (state.head > 40 && state.head < 60) {
        lowSpeeds.push(state.velocity);
      } else if (state.head < 10 || state.head > 90) {
        highSpeeds.push(state.velocity);
      }
    });
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

    expect(mean(lowSpeeds)).toBeGreaterThan(mean(highSpeeds) * 1.5);
  });

  it('should average about one lap every 20 seconds', () => {
    let travelled = 0;
    let previous = restingOrbit(profile);
    simulate(profile, previous, 60, true, (state) => {
      travelled += state.head - previous.head + (state.head < previous.head ? 100 : 0);
      previous = state;
    });

    expect(travelled / 100).toBeGreaterThan(2.7);
    expect(travelled / 100).toBeLessThan(3.3);
  });

  it('should stretch the arc when the head is fast and shrink it when the head is slow', () => {
    const samples: { speed: number; length: number }[] = [];
    simulate(profile, restingOrbit(profile), 60, true, (state) => {
      samples.push({ speed: state.velocity, length: state.head - state.tail });
    });
    const settled = samples.slice(samples.length / 2);
    const fastest = settled.reduce((a, b) => (b.speed > a.speed ? b : a));
    const slowest = settled.reduce((a, b) => (b.speed < a.speed ? b : a));

    expect(fastest.length).toBeGreaterThan(slowest.length);
    for (const { length } of samples) {
      expect(length).toBeGreaterThan(0);
    }
  });
});

describe('stepOrbit when paused', () => {
  const profile = buildOrbitProfile(squircle.path);

  it('should drop toward the bottom promptly when paused', () => {
    const start = {
      ...restingOrbit(profile),
      head: profile.bottom - 20,
      tail: profile.bottom - 20 - ORBIT_REST_LENGTH,
    };
    const paused = simulate(profile, start, 0.5, false);

    expect(profile.bottom - paused.head).toBeGreaterThan(5);
    expect(profile.bottom - paused.head).toBeLessThan(7.3);
  });

  it('should roll to the bottom and settle with the arc back at its resting length', () => {
    const running = simulate(profile, restingOrbit(profile), 13, true);
    const settled = simulate(profile, running, 15, false);

    expect(isOrbitResting(settled)).toBe(true);
    expect(settled.head).toBeCloseTo(profile.bottom, 0);
    expect(settled.head - settled.tail).toBeCloseTo(ORBIT_REST_LENGTH, 1);
  });

  it('should not count as resting while the head is still rolling', () => {
    const running = simulate(profile, restingOrbit(profile), 13, true);

    expect(isOrbitResting(stepOrbit(running, FRAME, false, profile))).toBe(false);
  });

  it('should shrink a stretched trail gradually while paused', () => {
    const start = { ...restingOrbit(profile), tail: profile.bottom - 10 };
    const paused = simulate(profile, start, 1, false);

    expect(paused.head - paused.tail).toBeGreaterThan(8.7);
    expect(paused.head - paused.tail).toBeLessThan(9);
    expect(isOrbitResting(simulate(profile, paused, 15, false))).toBe(true);
  });

  it('should expand a compressed trail promptly while paused', () => {
    const start = { ...restingOrbit(profile), tail: profile.bottom - 2.5 };
    const paused = simulate(profile, start, 1, false);

    expect(paused.head - paused.tail).toBeGreaterThan(3.55);
    expect(paused.head - paused.tail).toBeLessThan(3.9);
    expect(isOrbitResting(simulate(profile, paused, 15, false))).toBe(true);
  });
});

describe('orbitSegments', () => {
  it('should span the arc from tail to head with green at the tail and orange at the head', () => {
    const state = { head: 30, velocity: 0, tail: 20, tailVelocity: 0, settleTo: null };
    const segments = orbitSegments(state, 4);
    const last = segments[segments.length - 1];

    expect(segments[0].start).toBeCloseTo(20);
    expect(last.start + last.length).toBeCloseTo(30);
    expect(segments[0].mix).toBe(0);
    expect(last.mix).toBe(1);
  });
});
