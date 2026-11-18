import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TIMER_SHAPES } from '@/components/features/focus-shapes';
import { ORBIT_SEGMENTS, buildOrbitProfile } from '@/utils/orbit-physics';
import { useOrbit } from './use-orbit';

const profile = buildOrbitProfile(TIMER_SHAPES[0].path);

function createPaths() {
  const paths = Array.from({ length: ORBIT_SEGMENTS }, () =>
    document.createElementNS('http://www.w3.org/2000/svg', 'path')
  );
  return { current: paths as (SVGPathElement | null)[] };
}

function head(paths: { current: (SVGPathElement | null)[] }): string | null {
  return paths.current[ORBIT_SEGMENTS - 1]?.getAttribute('stroke-dashoffset') ?? null;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('useOrbit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 16)
    );
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => window.clearTimeout(handle));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('should keep moving the arc while running', () => {
    const paths = createPaths();
    renderHook(() => useOrbit(paths, { enabled: true, running: true, profile }));
    advance(500);
    const early = head(paths);
    advance(2000);

    expect(early).not.toBeNull();
    expect(head(paths)).not.toBe(early);
  });

  it('should stop moving once a paused arc has settled', () => {
    const paths = createPaths();
    const { rerender } = renderHook(
      ({ running }) => useOrbit(paths, { enabled: true, running, profile }),
      { initialProps: { running: true } }
    );
    advance(3000);
    rerender({ running: false });
    advance(20_000);
    const settled = head(paths);
    advance(5000);

    expect(head(paths)).toBe(settled);
  });

  it('should leave the arc alone while disabled', () => {
    const paths = createPaths();
    renderHook(() => useOrbit(paths, { enabled: false, running: true, profile }));
    advance(2000);

    expect(head(paths)).toBeNull();
  });
});
