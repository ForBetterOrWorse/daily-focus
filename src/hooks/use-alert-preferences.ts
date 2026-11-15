import { useCallback, useState } from 'react';

export const SOUND_STORAGE_KEY = 'daily-focus:soundEnabled';
export const NOTIFICATIONS_STORAGE_KEY = 'daily-focus:notificationsEnabled';
export const LAST_ALERT_STORAGE_KEY = 'daily-focus:lastAlert';

export interface AlertPreferences {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export function readAlertPreferences(): AlertPreferences {
  try {
    return {
      soundEnabled: window.localStorage.getItem(SOUND_STORAGE_KEY) !== 'false',
      notificationsEnabled: window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) === 'true',
    };
  } catch {
    return { soundEnabled: true, notificationsEnabled: false };
  }
}

export function claimAlert(id: string): boolean {
  try {
    if (window.localStorage.getItem(LAST_ALERT_STORAGE_KEY) === id) {
      return false;
    }

    window.localStorage.setItem(LAST_ALERT_STORAGE_KEY, id);
    return true;
  } catch {
    return true;
  }
}

function writePreference(key: string, enabled: boolean): void {
  try {
    window.localStorage.setItem(key, String(enabled));
  } catch {
    // Persistence is best-effort when browser storage is unavailable.
  }
}

export interface UseAlertPreferencesResult extends AlertPreferences {
  setSoundEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export function useAlertPreferences(): UseAlertPreferencesResult {
  const [preferences, setPreferences] = useState(readAlertPreferences);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    writePreference(SOUND_STORAGE_KEY, enabled);
    setPreferences((current) => ({ ...current, soundEnabled: enabled }));
  }, []);

  const setNotificationsEnabled = useCallback((enabled: boolean) => {
    writePreference(NOTIFICATIONS_STORAGE_KEY, enabled);
    setPreferences((current) => ({ ...current, notificationsEnabled: enabled }));
  }, []);

  return { ...preferences, setSoundEnabled, setNotificationsEnabled };
}
