import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  LAST_ALERT_STORAGE_KEY,
  NOTIFICATIONS_STORAGE_KEY,
  SOUND_STORAGE_KEY,
  claimAlert,
  readAlertPreferences,
  useAlertPreferences,
} from './use-alert-preferences';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('readAlertPreferences', () => {
  it('should default to sound on and notifications off', () => {
    expect(readAlertPreferences()).toEqual({ soundEnabled: true, notificationsEnabled: false });
  });

  it('should honor a stored false for sound and a stored true for notifications', () => {
    localStorage.setItem(SOUND_STORAGE_KEY, 'false');
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, 'true');

    expect(readAlertPreferences()).toEqual({ soundEnabled: false, notificationsEnabled: true });
  });

  it('should treat other stored values as the defaults', () => {
    localStorage.setItem(SOUND_STORAGE_KEY, 'no');
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, 'yes');

    expect(readAlertPreferences()).toEqual({ soundEnabled: true, notificationsEnabled: false });
  });

  it('should return the defaults without throwing when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    expect(readAlertPreferences()).toEqual({ soundEnabled: true, notificationsEnabled: false });
  });
});

describe('useAlertPreferences', () => {
  it('should initialize from the defaults without writing to storage', () => {
    const { result } = renderHook(() => useAlertPreferences());

    expect(result.current.soundEnabled).toBe(true);
    expect(result.current.notificationsEnabled).toBe(false);
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)).toBeNull();
  });

  it('should persist and reflect a sound change', () => {
    const { result } = renderHook(() => useAlertPreferences());

    act(() => result.current.setSoundEnabled(false));

    expect(result.current.soundEnabled).toBe(false);
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('false');
    expect(readAlertPreferences().soundEnabled).toBe(false);
  });

  it('should persist and reflect a notifications change', () => {
    const { result } = renderHook(() => useAlertPreferences());

    act(() => result.current.setNotificationsEnabled(true));

    expect(result.current.notificationsEnabled).toBe(true);
    expect(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)).toBe('true');
    expect(readAlertPreferences().notificationsEnabled).toBe(true);
  });

  it('should keep the other preference when one setter runs', () => {
    const { result } = renderHook(() => useAlertPreferences());

    act(() => result.current.setSoundEnabled(false));
    act(() => result.current.setNotificationsEnabled(true));

    expect(result.current.soundEnabled).toBe(false);
    expect(result.current.notificationsEnabled).toBe(true);
  });

  it('should update state without throwing when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const { result } = renderHook(() => useAlertPreferences());

    expect(() => act(() => result.current.setSoundEnabled(false))).not.toThrow();
    expect(result.current.soundEnabled).toBe(false);

    expect(() => act(() => result.current.setNotificationsEnabled(true))).not.toThrow();
    expect(result.current.notificationsEnabled).toBe(true);
  });
});

describe('claimAlert', () => {
  it('should return true then false for the same id', () => {
    expect(claimAlert('phase-end-1')).toBe(true);
    expect(claimAlert('phase-end-1')).toBe(false);
    expect(localStorage.getItem(LAST_ALERT_STORAGE_KEY)).toBe('phase-end-1');
  });

  it('should return true for a new id after another was claimed', () => {
    claimAlert('phase-end-1');

    expect(claimAlert('phase-end-2')).toBe(true);
    expect(localStorage.getItem(LAST_ALERT_STORAGE_KEY)).toBe('phase-end-2');
  });

  it('should return true when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    expect(claimAlert('phase-end-1')).toBe(true);
  });
});
