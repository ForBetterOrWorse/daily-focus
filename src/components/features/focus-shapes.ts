export const DIAL_SIZE = 232;

const DIAL_CENTER = DIAL_SIZE / 2;
const STEPS = 240;

function polarPath(center: number, radiusAt: (angle: number) => number): string {
  let path = '';
  for (let i = 0; i <= STEPS; i++) {
    const angle = -Math.PI / 2 + (i / STEPS) * Math.PI * 2;
    const r = radiusAt(angle + Math.PI / 2);
    const x = (center + r * Math.cos(angle)).toFixed(2);
    const y = (center + r * Math.sin(angle)).toFixed(2);
    path += `${i === 0 ? 'M' : 'L'}${x} ${y}`;
  }
  return `${path}Z`;
}

/** A closed outline whose radius swells `lobes` times around the center. Starts at the top. */
export function lobedPath(
  center: number,
  radius: number,
  lobes: number,
  amplitude: number
): string {
  return polarPath(center, (t) => radius * (1 + amplitude * Math.cos(lobes * t)));
}

function squirclePath(center: number, radius: number, exponent: number): string {
  let path = '';
  for (let i = 0; i <= STEPS; i++) {
    const t = -Math.PI / 2 + (i / STEPS) * Math.PI * 2;
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    const x = radius * Math.sign(cos) * Math.abs(cos) ** (2 / exponent);
    const y = radius * Math.sign(sin) * Math.abs(sin) ** (2 / exponent);
    path += `${i === 0 ? 'M' : 'L'}${(center + x).toFixed(2)} ${(center + y).toFixed(2)}`;
  }
  return `${path}Z`;
}

export interface TimerShape {
  id: string;
  name: string;
  path: string;
}

/**
 * Timer outlines. A new timer picks one at random and the outline never rotates.
 * Nine lobes belong to habits and twelve to the streak badge, so neither appears here.
 */
export const TIMER_SHAPES: TimerShape[] = [
  { id: 'clover', name: 'Clover', path: lobedPath(DIAL_CENTER, 98, 4, 0.11) },
  { id: 'trefoil', name: 'Trefoil', path: lobedPath(DIAL_CENTER, 96, 3, 0.12) },
  { id: 'pentafoil', name: 'Pentafoil', path: lobedPath(DIAL_CENTER, 98, 5, 0.08) },
  { id: 'flower', name: 'Flower', path: lobedPath(DIAL_CENTER, 100, 6, 0.09) },
  { id: 'squircle', name: 'Squircle', path: squirclePath(DIAL_CENTER, 100, 4.5) },
  { id: 'soft-triangle', name: 'Soft triangle', path: lobedPath(DIAL_CENTER, 100, 3, 0.05) },
  { id: 'soft-pentagon', name: 'Soft pentagon', path: lobedPath(DIAL_CENTER, 102, 5, 0.035) },
  {
    id: 'pebble',
    name: 'Pebble',
    path: polarPath(
      DIAL_CENTER,
      (t) => 100 * (1 + 0.06 * Math.cos(2 * t) + 0.04 * Math.cos(3 * t + 1))
    ),
  },
];

export function pickTimerShape(random: () => number, exceptId?: string): TimerShape {
  const pool = TIMER_SHAPES.filter((shape) => shape.id !== exceptId);
  return pool[Math.floor(random() * pool.length) % pool.length];
}

export interface TraceSegment {
  /** Start along the path, out of 100. */
  start: number;
  length: number;
  /** How far this segment sits from green (0) to orange (1). */
  mix: number;
}

const TRACE_SEGMENTS = 48;

/**
 * Splits the elapsed part of the ring into short segments so its color runs the full green to
 * orange range over whatever has elapsed. SVG gradients can only follow a straight line.
 */
export function traceSegments(progress: number, count = TRACE_SEGMENTS): TraceSegment[] {
  const total = Math.min(Math.max(progress, 0), 1) * 100;
  const step = total / count;
  return Array.from({ length: count }, (_, i) => ({
    start: i * step,
    length: step,
    mix: count === 1 ? 1 : i / (count - 1),
  }));
}

export const HABIT_PATH = lobedPath(50, 45, 9, 0.06);

/** A task's outline: a hand-drawn rounded square, uneven on every side. */
export const TASK_PATH =
  'M18 10C40 6 62 8 84 11C92 12 94 18 93 26C91 46 92 66 90 84C89 92 83 94 75 93C54 91 34 92 16 90C9 89 7 84 8 76C9 56 7 36 9 18C10 12 13 10 18 10Z';

/** A soft, uneven blob behind the streak count, in a 120 by 100 box. */
export const STREAK_BLOB =
  'M20 34C30 12 66 4 92 14C114 23 120 52 106 72C92 92 56 98 32 88C8 78 10 52 20 34Z';
