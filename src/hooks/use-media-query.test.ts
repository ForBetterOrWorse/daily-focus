import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './use-media-query';

function mockMatchMedia(matches: boolean) {
  let changeHandler: ((e: Partial<MediaQueryListEvent>) => void) | null = null;
  const mq = {
    matches,
    addEventListener: vi.fn(
      (_event: string, handler: (e: Partial<MediaQueryListEvent>) => void) => {
        changeHandler = handler;
      }
    ),
    removeEventListener: vi.fn(),
  };
  vi.spyOn(window, 'matchMedia').mockReturnValue(mq as unknown as MediaQueryList);
  return {
    mq,
    fire: (nextMatches: boolean) => {
      mq.matches = nextMatches;
      changeHandler?.({ matches: nextMatches });
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useMediaQuery', () => {
  it('should return the real match on the first render', () => {
    mockMatchMedia(true);
    const seen: boolean[] = [];
    renderHook(() => {
      const matches = useMediaQuery('(min-width: 1024px)');
      seen.push(matches);
      return matches;
    });
    expect(seen[0]).toBe(true);
  });

  it('should return false when the query does not match', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);
  });

  it('should update when the media query match changes', () => {
    const { fire } = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));

    expect(result.current).toBe(false);
    act(() => fire(true));
    expect(result.current).toBe(true);
    act(() => fire(false));
    expect(result.current).toBe(false);
  });
});
