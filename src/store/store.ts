import { openApp } from '../domain/card';
import { phaseEndOf, type PhaseEnd } from '../domain/phase-end';
import { emptyData, parseData } from '../domain/schema';
import { reduce, type Action } from '../domain/reduce';
import type { AppData } from '../domain/types';

export const STORAGE_KEY = 'daily-focus:data';

export interface StoreState {
  data: AppData;
  error: string | null;
  /** The action that produced `data`. `null` for loaded or cross-tab data. */
  lastAction: Action | null;
}

export interface AppStore {
  getState: () => StoreState;
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: Action) => void;
  /** Returns the phase end settled at load, once. Later calls return `null`. */
  takeMissedPhaseEnd: () => PhaseEnd | null;
  destroy: () => void;
}

interface CreateStoreOptions {
  storage: Storage;
  now: () => number;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function corruptKey(storage: Storage, now: number): string {
  const base = `${STORAGE_KEY}:corrupt-${now}`;
  let key = base;
  let suffix = 1;

  while (storage.getItem(key) !== null) {
    key = `${base}-${suffix}`;
    suffix += 1;
  }

  return key;
}

export function createStore({ storage, now }: CreateStoreOptions): AppStore {
  let state: StoreState;
  let shouldPersistLoadedData = false;
  let missedPhaseEnd: PhaseEnd | null = null;
  const listeners = new Set<() => void>();
  const rawData = storage.getItem(STORAGE_KEY);

  if (rawData === null) {
    state = { data: emptyData(now()), error: null, lastAction: null };
  } else {
    try {
      const data = parseData(JSON.parse(rawData));
      state = { data: openApp(data, now()), error: null, lastAction: null };
      shouldPersistLoadedData = data.run !== null && state.data !== data;
      missedPhaseEnd = phaseEndOf(data, state.data);
    } catch (error) {
      const backupKey = corruptKey(storage, now());
      storage.setItem(backupKey, rawData);
      storage.removeItem(STORAGE_KEY);
      state = {
        data: emptyData(now()),
        error: `Stored data was invalid and has been moved to ${backupKey}: ${messageOf(error)}`,
        lastAction: null,
      };
    }
  }

  function notify(): void {
    listeners.forEach((listener) => listener());
  }

  function onStorage(event: StorageEvent): void {
    if (event.key !== STORAGE_KEY && event.key !== null) {
      return;
    }

    if (event.storageArea !== null && event.storageArea !== storage) {
      return;
    }

    if (event.newValue === null) {
      state = { data: emptyData(now()), error: null, lastAction: null };
      notify();
      return;
    }

    try {
      state = { data: parseData(JSON.parse(event.newValue)), error: null, lastAction: null };
    } catch (error) {
      state = { ...state, error: `Data from another tab was invalid: ${messageOf(error)}` };
    }

    notify();
  }

  let persistenceRequested = false;

  function requestPersistence(): void {
    if (persistenceRequested || !navigator.storage?.persist) {
      return;
    }

    persistenceRequested = true;
    void navigator.storage.persist().catch((error: unknown) => {
      state = { ...state, error: `Browser storage could not be protected: ${messageOf(error)}` };
      notify();
    });
  }

  if (shouldPersistLoadedData) {
    storage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    requestPersistence();
  }

  window.addEventListener('storage', onStorage);

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(action) {
      const data = reduce(state.data, action, now());
      if (data === state.data) {
        return;
      }

      storage.setItem(STORAGE_KEY, JSON.stringify(data));
      state = { ...state, data, lastAction: action };
      notify();
      requestPersistence();
    },
    takeMissedPhaseEnd() {
      const taken = missedPhaseEnd;
      missedPhaseEnd = null;
      return taken;
    },
    destroy() {
      window.removeEventListener('storage', onStorage);
      listeners.clear();
    },
  };
}
