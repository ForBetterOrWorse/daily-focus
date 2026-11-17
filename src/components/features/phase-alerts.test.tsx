import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/base/toast/toast';
import type { ItemInput } from '@/domain/items';
import { NOTIFICATIONS_STORAGE_KEY, SOUND_STORAGE_KEY } from '@/hooks/use-alert-preferences';
import { createStore, type AppStore } from '@/store/store';
import { AppDataProvider } from '@/store/use-app-data';
import { playChime } from '@/utils/chime';
import { showNotification } from '@/utils/notify';
import { PhaseAlerts } from './phase-alerts';

vi.mock('@/utils/chime', () => ({ playChime: vi.fn(), unlockChime: vi.fn() }));
vi.mock('@/utils/notify', () => ({ showNotification: vi.fn() }));

const START = new Date(2026, 9, 28, 12, 0, 0).getTime();
const MINUTE = 60_000;
const PAGE_TITLE = 'Today | Daily Focus';
const stores: AppStore[] = [];

const readItem: ItemInput = {
  kind: 'habit',
  name: 'Read',
  completion: 'time',
  target: 30,
  timerStyle: 'sessions',
};

function seedRunningStore(): AppStore {
  const store = createStore({ storage: window.localStorage, now: () => START });
  stores.push(store);
  store.dispatch({ type: 'addItem', item: readItem });
  const item = store.getState().data.items[0];
  store.dispatch({ type: 'start', itemId: item.id });
  return store;
}

function renderAlerts(store: AppStore) {
  return render(
    <AppDataProvider store={store}>
      <ToastProvider>
        <PhaseAlerts />
      </ToastProvider>
    </AppDataProvider>
  );
}

function setup() {
  vi.setSystemTime(START);
  const store = seedRunningStore();
  const reopened = createStore({ storage: window.localStorage, now: Date.now });
  stores.push(store, reopened);
  const view = renderAlerts(reopened);
  return { store: reopened, ...view };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function showVisibilityChange() {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

beforeEach(() => {
  vi.useFakeTimers({ now: START, shouldAdvanceTime: true });
  document.title = PAGE_TITLE;
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
});

afterEach(() => {
  stores.splice(0).forEach((store) => store.destroy());
  window.localStorage.clear();
  vi.mocked(playChime).mockClear();
  vi.mocked(showNotification).mockClear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('PhaseAlerts', () => {
  it('should settle a phase at its end and show the toast once', () => {
    const { store } = setup();

    advance(25 * MINUTE + 1000);

    expect(store.getState().data.run).toBeNull();
    expect(within(screen.getByRole('list')).getAllByText('Focus 1 done. Break next.')).toHaveLength(
      1
    );
    advance(MINUTE);
    expect(within(screen.getByRole('list')).getAllByText('Focus 1 done. Break next.')).toHaveLength(
      1
    );
    expect(playChime).toHaveBeenCalledTimes(1);
  });

  it('should settle an overdue phase when the page becomes visible and keep the ended-at toast', () => {
    const { store } = setup();

    vi.setSystemTime(START + 30 * MINUTE);
    showVisibilityChange();

    expect(store.getState().data.run).toBeNull();
    expect(screen.getByText(/^Focus 1 ended at .+\. Break next\.$/)).toBeVisible();
    advance(60_000);
    expect(screen.getByText(/^Focus 1 ended at .+\. Break next\.$/)).toBeVisible();
    expect(playChime).not.toHaveBeenCalled();
    expect(showNotification).not.toHaveBeenCalled();
  });

  it('should show the ended-at toast for a phase that ended while the app was closed', () => {
    seedRunningStore().destroy();
    vi.setSystemTime(START + 30 * MINUTE);
    const store = createStore({ storage: window.localStorage, now: Date.now });
    stores.push(store);

    renderAlerts(store);

    expect(screen.getByText(/^Focus 1 ended at .+\. Break next\.$/)).toBeVisible();
    expect(playChime).not.toHaveBeenCalled();
  });

  it('should stay silent when Sound is off', () => {
    window.localStorage.setItem(SOUND_STORAGE_KEY, 'false');
    setup();

    advance(25 * MINUTE + 1000);

    expect(within(screen.getByRole('list')).getByText('Focus 1 done. Break next.')).toBeVisible();
    expect(playChime).not.toHaveBeenCalled();
  });

  it('should show a notification when enabled and the window is in the background', () => {
    window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, 'true');
    vi.mocked(document.hasFocus).mockReturnValue(false);
    setup();

    advance(25 * MINUTE + 1000);

    expect(showNotification).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith('Read', 'Focus 1 done. Break next.');
  });

  it('should not show a notification when the window is focused', () => {
    window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, 'true');
    setup();

    advance(25 * MINUTE + 1000);

    expect(showNotification).not.toHaveBeenCalled();
  });

  it('should not show a notification when notifications are off', () => {
    vi.mocked(document.hasFocus).mockReturnValue(false);
    setup();

    advance(25 * MINUTE + 1000);

    expect(showNotification).not.toHaveBeenCalled();
  });

  it('should show nothing on a manual pause', () => {
    const { store } = setup();

    advance(5 * MINUTE);
    act(() => store.dispatch({ type: 'pause' }));
    advance(MINUTE);

    expect(store.getState().data.run).toBeNull();
    expect(screen.queryByText(/done|ended at/)).not.toBeInTheDocument();
    expect(playChime).not.toHaveBeenCalled();
    expect(showNotification).not.toHaveBeenCalled();
  });

  it('should show the countdown in the tab title while running and restore the page title after a pause', () => {
    const { store } = setup();

    advance(5000);
    expect(document.title).toBe('24:55 Focus | Daily Focus');

    act(() => store.dispatch({ type: 'pause' }));
    expect(document.title).toBe(PAGE_TITLE);
  });
});
