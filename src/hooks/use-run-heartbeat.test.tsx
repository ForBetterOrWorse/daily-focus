import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDataProvider } from '@/store/use-app-data';
import { createStore } from '@/store/store';
import { useRunHeartbeat } from './use-run-heartbeat';

function Probe(): null {
  useRunHeartbeat();
  return null;
}

describe('useRunHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2024, 0, 1, 9) });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const store = createStore({ storage: localStorage, now: Date.now });
    store.dispatch({
      type: 'addItem',
      item: { name: 'Read', kind: 'task', completion: 'time', target: 30, timerStyle: 'free' },
    });
    const itemId = store.getState().data.items[0].id;
    store.dispatch({ type: 'start', itemId });
    const view = render(
      <AppDataProvider store={store}>
        <Probe />
      </AppDataProvider>
    );
    return { store, view };
  }

  it('should record the last seen time while a run is active', () => {
    const { store } = setup();
    const startedAt = store.getState().data.run!.lastSeenAt!;

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(store.getState().data.run!.lastSeenAt).toBe(startedAt + 30_000);
  });

  it('should stop its timer when the run is paused', () => {
    const { store } = setup();

    act(() => {
      store.dispatch({ type: 'pause' });
    });

    expect(vi.getTimerCount()).toBe(0);
  });

  it('should stop its timer when unmounted', () => {
    const { view } = setup();

    view.unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
