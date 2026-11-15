import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';
export type ThemePreference = 'system' | Theme;

/**
 * The localStorage key holding the persisted theme preference. Exported so the layout's
 * pre-paint inline script can be guarded against key drift; the script itself
 * must inline the literal, since inline scripts cannot import.
 */
export const THEME_STORAGE_KEY = 'daily-focus:theme';

const LIGHT_QUERY = '(prefers-color-scheme: light)';

const preferenceListeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  } catch {
    // Follow the system when storage is unavailable.
  }
  return 'system';
}

function writePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // Persistence is best-effort: a full or unavailable store must not break the app.
  }
  preferenceListeners.forEach((listener) => listener());
}

function subscribePreference(onChange: () => void): () => void {
  preferenceListeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === THEME_STORAGE_KEY) {
      onChange();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    preferenceListeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

function subscribeSystem(onChange: () => void): () => void {
  const query = window.matchMedia(LIGHT_QUERY);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

function readSystemIsLight(): boolean {
  return window.matchMedia(LIGHT_QUERY).matches;
}

export interface UseThemeResult {
  /** The theme in effect: the stored choice, or the system theme while the preference is `system`. */
  theme: Theme;
  isDark: boolean;
  /** The stored choice. `system` follows `prefers-color-scheme`, falling back to dark. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Switches to the opposite of the theme in effect and stores it as an explicit choice. */
  toggleTheme: () => void;
}

/**
 * Theme state that respects user preferences and persistence. The stored preference is
 * `light`, `dark`, or absent (`system`). While it is `system`, the theme follows
 * `prefers-color-scheme` and updates when the device changes. The resolved theme is reflected
 * onto `documentElement` as `data-theme`. First paint is stamped by the layout's pre-paint
 * inline script, so this effect re-asserts the same value with no flash.
 */
export function useTheme(): UseThemeResult {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribePreference,
    readPreference,
    () => 'system'
  );
  const systemIsLight = useSyncExternalStore(subscribeSystem, readSystemIsLight, () => false);
  const theme: Theme = preference === 'system' ? (systemIsLight ? 'light' : 'dark') : preference;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    writePreference(theme === 'dark' ? 'light' : 'dark');
  }, [theme]);

  return {
    theme,
    isDark: theme === 'dark',
    preference,
    setPreference: writePreference,
    toggleTheme,
  };
}
