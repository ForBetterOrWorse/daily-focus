import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTheme } from './use-theme';

const STORAGE_KEY = 'daily-focus:theme';

// Mock matchMedia to simulate system theme preference
let systemChange: (() => void) | null = null;
let systemIsDark = true;

function mockMatchMedia(prefersDark: boolean) {
  systemIsDark = prefersDark;
  systemChange = null;
  window.matchMedia = vi.fn((query) => ({
    get matches() {
      return query === '(prefers-color-scheme: light)' ? !systemIsDark : systemIsDark;
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_type: string, listener: () => void) => {
      systemChange = listener;
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  // Default to dark system preference
  mockMatchMedia(true);
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.clearAllMocks();
});

describe('useTheme', () => {
  it('should default to dark when system prefers dark and localStorage is empty', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should default to light when system prefers light and localStorage is empty', () => {
    mockMatchMedia(false); // System prefers light
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should toggle between dark and light', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    expect(result.current.isDark).toBe(true);
  });

  it('should read the persisted theme on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'light');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
  });

  it('should fall back to system preference when the stored value is malformed', () => {
    localStorage.setItem(STORAGE_KEY, 'chartreuse');
    mockMatchMedia(false); // System prefers light

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
  });

  it('should not write storage on mount while following the system', () => {
    renderHook(() => useTheme());

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('should report the system preference by default', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe('system');
  });

  it('should follow system changes while the preference is system', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      systemIsDark = false;
      systemChange?.();
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should ignore system changes once a theme is chosen', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setPreference('dark'));
    act(() => {
      systemIsDark = false;
      systemChange?.();
    });

    expect(result.current.theme).toBe('dark');
  });

  it('should store an explicit choice and clear it for system', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setPreference('light'));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    expect(result.current.preference).toBe('light');

    act(() => result.current.setPreference('system'));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(result.current.preference).toBe('system');
    expect(result.current.theme).toBe('dark');
  });

  it('should treat a stored system value as following the system', () => {
    localStorage.setItem(STORAGE_KEY, 'system');
    mockMatchMedia(false);

    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe('system');
    expect(result.current.theme).toBe('light');
  });

  it('should keep two hook instances in sync', () => {
    const view = renderHook(() => useTheme());
    const utils = renderHook(() => useTheme());

    act(() => view.result.current.setPreference('light'));

    expect(utils.result.current.theme).toBe('light');
  });
});
