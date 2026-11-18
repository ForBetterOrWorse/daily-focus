import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyData } from '../domain/schema';
import { createStore, STORAGE_KEY } from './store';

class FakeStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

const stores: { destroy: () => void }[] = [];
const storageDescriptor = Object.getOwnPropertyDescriptor(navigator, 'storage');

function makeStore(storage = new FakeStorage(), now = 1_700_000_000_000) {
  const store = createStore({ storage, now: () => now });
  stores.push(store);
  return { store, storage };
}

afterEach(() => {
  stores.splice(0).forEach(({ destroy }) => destroy());
  if (storageDescriptor) {
    Object.defineProperty(navigator, 'storage', storageDescriptor);
  } else {
    Reflect.deleteProperty(navigator, 'storage');
  }
});

describe('createStore', () => {
  it('should persist a dispatch and reload a paused quick session still pinned', () => {
    const storage = new FakeStorage();
    const { store } = makeStore(storage);

    store.dispatch({ type: 'newQuickSession', start: true, name: 'Writing' });
    store.dispatch({ type: 'pause' });

    const data = store.getState().data;
    const reloaded = makeStore(storage).store.getState().data;

    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(data));
    expect(reloaded).toEqual(data);
    expect(reloaded.cardItemId).toBe(reloaded.items[0].id);
    expect(reloaded.clocks[reloaded.cardItemId!]).toBeDefined();
    expect(reloaded.run).toBeNull();
  });

  it('should update subscribers when another tab writes the stored document', () => {
    const { store, storage } = makeStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const data = emptyData(20);

    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(
      new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(data) })
    );

    expect(store.getState().data).toEqual(data);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
  });

  it('should move corrupt data aside and start with empty data', () => {
    const storage = new FakeStorage();
    const corrupt = '{"version": 9}';
    storage.setItem(STORAGE_KEY, corrupt);

    const { store } = makeStore(storage, 123);

    expect(storage.getItem(`${STORAGE_KEY}:corrupt-123`)).toBe(corrupt);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(store.getState().data).toEqual(emptyData(123));
    expect(store.getState().error).toContain('Stored data was invalid');
  });

  it('should settle and save a run left going when the store loads', () => {
    const storage = new FakeStorage();
    const start = 1_700_000_000_000;
    const { store } = makeStore(storage, start);
    store.dispatch({ type: 'newQuickSession', start: true, name: 'Writing' });

    const saved = JSON.parse(storage.getItem(STORAGE_KEY)!);
    saved.run.lastSeenAt = start + 13 * 60 * 60 * 1000 - 60 * 1000;
    storage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const { store: reloaded } = makeStore(storage, start + 13 * 60 * 60 * 1000);
    const data = reloaded.getState().data;

    expect(data.run).toBeNull();
    expect(data.sessions.reduce((total, session) => total + session.durationMs, 0)).toBe(
      12 * 60 * 60 * 1000
    );
    expect(data.meta.autoStop).toEqual({
      itemId: data.items[0].id,
      at: start + 12 * 60 * 60 * 1000,
    });
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(data));
  });

  it('should hand over a phase end settled at load once', () => {
    const storage = new FakeStorage();
    const start = 1_700_000_000_000;
    const { store } = makeStore(storage, start);
    store.dispatch({ type: 'newQuickSession', start: true, name: 'Writing' });
    const itemId = store.getState().data.items[0].id;
    store.dispatch({ type: 'setQuickStyle', itemId, style: 'sessions' });
    const startedAt = store.getState().data.run!.startedAt;

    const { store: reloaded } = makeStore(storage, start + 60 * 60 * 1000);
    const missed = reloaded.takeMissedPhaseEnd();

    expect(missed).toMatchObject({
      itemId,
      name: 'Writing',
      endedAt: startedAt + 25 * 60 * 1000,
    });
    expect(missed?.started.phase).toBe('focus');
    expect(missed?.settled.phase).toBe('break');
    expect(reloaded.takeMissedPhaseEnd()).toBeNull();
  });

  it('should request persistent storage once after the first write', () => {
    const persist = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persist },
    });
    const { store } = makeStore();

    store.dispatch({ type: 'restore', snapshot: emptyData(20) });
    store.dispatch({ type: 'restore', snapshot: emptyData(30) });

    expect(persist).toHaveBeenCalledOnce();
  });
});
