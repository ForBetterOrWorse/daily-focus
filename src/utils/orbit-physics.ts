/*
 * Motion for the Free run arc. The head rolls along the ring like a marble: fastest at the bottom,
 * slowest at the top. The tail chases the head on a damped spring, so the arc stretches while the
 * head speeds up and shrinks while it slows. Paused, the head rolls to the bottom of the ring and
 * settles there. Positions are in path units, where one lap is 100.
 */

const LAP_SECONDS = 20;
const SPEED_SWING = 0.5;
const HEAD_RESPONSE_SECONDS = 0.3;
const SETTLE_FREQUENCY = 3.3;
const SETTLE_DAMPING_RATIO = 0.6;
const TAIL_LAG_SECONDS = 1.5;
const TAIL_DAMPING_RATIO = 0.7;
const PAUSED_STRETCHED_FREQUENCY_FACTOR = 0.9;
const PAUSED_COMPRESSED_FREQUENCY_FACTOR = 1.4;
const MIN_LENGTH = 2;
const MAX_LENGTH = 30;
const PROFILE_SAMPLES = 360;
const REST_TOLERANCE = 0.05;

export const ORBIT_REST_LENGTH = 5;
export const ORBIT_SEGMENTS = 48;

const TAIL_FREQUENCY = (2 * TAIL_DAMPING_RATIO) / TAIL_LAG_SECONDS;

export interface OrbitProfile {
  /** Height at evenly spaced points along the ring, from -1 at the top to 1 at the bottom. */
  heights: number[];
  /** Where the ring is lowest, in path units. */
  bottom: number;
  /** Path units per second for a head at mid height, chosen so a lap takes `LAP_SECONDS` on average. */
  baseSpeed: number;
}

export interface OrbitState {
  head: number;
  velocity: number;
  tail: number;
  tailVelocity: number;
  settleTo: number | null;
}

export interface OrbitSegment {
  /** Start along the path, out of 100. */
  start: number;
  length: number;
  /** How far this segment sits from green (0) to orange (1). */
  mix: number;
}

function wrapDistance(distance: number): number {
  return ((((distance + 50) % 100) + 100) % 100) - 50;
}

/** Reads a closed outline made of `x y` pairs and measures how high each part of it sits. */
export function buildOrbitProfile(path: string): OrbitProfile {
  const points = [...path.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }));
  const distance = [0];
  for (let i = 1; i < points.length; i++) {
    distance.push(
      distance[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    );
  }
  const total = distance[distance.length - 1];

  const ys: number[] = [];
  let segment = 0;
  for (let j = 0; j < PROFILE_SAMPLES; j++) {
    const target = (j / PROFILE_SAMPLES) * total;
    while (distance[segment + 1] < target) {
      segment++;
    }
    const span = distance[segment + 1] - distance[segment] || 1;
    const fraction = (target - distance[segment]) / span;
    ys.push(points[segment].y + (points[segment + 1].y - points[segment].y) * fraction);
  }

  const lowest = Math.min(...ys);
  const highest = Math.max(...ys);
  const middle = (lowest + highest) / 2;
  const halfRange = (highest - lowest) / 2 || 1;
  const heights = ys.map((y) => (y - middle) / halfRange);
  const meanPace =
    heights.reduce((sum, height) => sum + 1 / (1 + SPEED_SWING * height), 0) / heights.length;

  return {
    heights,
    bottom: (heights.indexOf(Math.max(...heights)) * 100) / PROFILE_SAMPLES,
    baseSpeed: (100 * meanPace) / LAP_SECONDS,
  };
}

function heightAt(profile: OrbitProfile, position: number): number {
  const count = profile.heights.length;
  const x = ((((position % 100) + 100) % 100) / 100) * count;
  const index = Math.floor(x);
  const fraction = x - index;
  return (
    profile.heights[index % count] * (1 - fraction) +
    profile.heights[(index + 1) % count] * fraction
  );
}

/** A short arc resting at the lowest point of the ring. */
export function restingOrbit(profile: OrbitProfile): OrbitState {
  return {
    head: profile.bottom,
    velocity: 0,
    tail: profile.bottom - ORBIT_REST_LENGTH,
    tailVelocity: 0,
    settleTo: null,
  };
}

export function stepOrbit(
  state: OrbitState,
  seconds: number,
  running: boolean,
  profile: OrbitProfile
): OrbitState {
  let { head, velocity, tail, tailVelocity, settleTo } = state;

  if (running) {
    settleTo = null;
    const target = profile.baseSpeed * (1 + SPEED_SWING * heightAt(profile, head));
    velocity += (target - velocity) * (1 - Math.exp(-seconds / HEAD_RESPONSE_SECONDS));
  } else {
    settleTo ??= head + wrapDistance(profile.bottom - head);
    const pull = SETTLE_FREQUENCY ** 2 * (settleTo - head);
    const drag = 2 * SETTLE_DAMPING_RATIO * SETTLE_FREQUENCY * velocity;
    velocity += (pull - drag) * seconds;
  }
  head += velocity * seconds;

  const tailFrequency = running
    ? TAIL_FREQUENCY
    : TAIL_FREQUENCY *
      (head - tail > ORBIT_REST_LENGTH
        ? PAUSED_STRETCHED_FREQUENCY_FACTOR
        : PAUSED_COMPRESSED_FREQUENCY_FACTOR);
  const pull = tailFrequency ** 2 * (head - ORBIT_REST_LENGTH - tail);
  const drag = 2 * TAIL_DAMPING_RATIO * tailFrequency * tailVelocity;
  tailVelocity += (pull - drag) * seconds;
  tail += tailVelocity * seconds;
  tail = head - Math.min(Math.max(head - tail, MIN_LENGTH), MAX_LENGTH);

  const lap = head >= 100 ? -100 : head < 0 ? 100 : 0;
  return {
    head: head + lap,
    velocity,
    tail: tail + lap,
    tailVelocity,
    settleTo: settleTo === null ? null : settleTo + lap,
  };
}

export function isOrbitResting(state: OrbitState): boolean {
  return (
    state.settleTo !== null &&
    Math.abs(state.velocity) < REST_TOLERANCE &&
    Math.abs(state.tailVelocity) < REST_TOLERANCE &&
    Math.abs(state.head - state.settleTo) < REST_TOLERANCE &&
    Math.abs(state.head - state.tail - ORBIT_REST_LENGTH) < REST_TOLERANCE
  );
}

/**
 * Splits the arc into short segments so its color runs the full green to orange range from tail
 * to head. SVG gradients can only follow a straight line.
 */
export function orbitSegments(state: OrbitState, count = ORBIT_SEGMENTS): OrbitSegment[] {
  const length = state.head - state.tail;
  return Array.from({ length: count }, (_, i) => ({
    start: state.tail + (i / count) * length,
    length: length / count,
    mix: count === 1 ? 1 : i / (count - 1),
  }));
}
