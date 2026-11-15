import { describe, expect, it } from 'vitest';
import { TIMER_SHAPES, pickTimerShape, traceSegments } from './focus-shapes';

describe('TIMER_SHAPES', () => {
  it('should offer a larger set of closed outlines with unique ids', () => {
    expect(TIMER_SHAPES.length).toBeGreaterThanOrEqual(8);
    expect(new Set(TIMER_SHAPES.map((shape) => shape.id)).size).toBe(TIMER_SHAPES.length);
    for (const shape of TIMER_SHAPES) {
      expect(shape.path.startsWith('M')).toBe(true);
      expect(shape.path.endsWith('Z')).toBe(true);
    }
  });
});

describe('pickTimerShape', () => {
  it('should never repeat the shape it is told to avoid', () => {
    for (const value of [0, 0.25, 0.5, 0.999]) {
      expect(pickTimerShape(() => value, 'clover').id).not.toBe('clover');
    }
  });
});

describe('traceSegments', () => {
  it('should cover exactly the elapsed part of the ring, end to end', () => {
    const segments = traceSegments(0.3, 4);
    const last = segments[segments.length - 1];

    expect(segments[0].start).toBe(0);
    expect(last.start + last.length).toBeCloseTo(30);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].start).toBeCloseTo(segments[i - 1].start + segments[i - 1].length);
    }
  });

  it('should run the full green to orange range at any progress', () => {
    for (const progress of [0.05, 0.5, 1]) {
      const mixes = traceSegments(progress, 5).map((segment) => segment.mix);

      expect(mixes[0]).toBe(0);
      expect(mixes[mixes.length - 1]).toBe(1);
    }
  });
});
