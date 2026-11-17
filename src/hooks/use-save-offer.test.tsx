import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/base/toast/toast';
import { LiveAnnouncerProvider } from '@/components/features/live-announcer';
import { Today } from '@/pages/today';
import { createStore, type AppStore } from '@/store/store';
import { AppDataProvider } from '@/store/use-app-data';

const stores: AppStore[] = [];

async function finishToastExit(message: string) {
  const notifications = screen.getByRole('region', { name: 'Notifications' });
  const toasts = within(notifications)
    .getAllByRole('listitem', { hidden: true })
    .filter((item) => within(item).queryByText(message));
  if (toasts.length === 0) {
    throw new Error(`Could not find the toast containing "${message}"`);
  }
  await waitFor(() => expect(toasts.some((toast) => toast.hasAttribute('inert'))).toBe(true));
  toasts
    .filter((toast) => toast.hasAttribute('inert'))
    .forEach((toast) => {
      fireEvent.transitionEnd(toast, { propertyName: 'opacity' });
    });
}

function setup() {
  const store = createStore({ storage: window.localStorage, now: Date.now });
  stores.push(store);
  render(
    <AppDataProvider store={store}>
      <ToastProvider>
        <LiveAnnouncerProvider>
          <Today />
        </LiveAnnouncerProvider>
      </ToastProvider>
    </AppDataProvider>
  );
  return store;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function startQuick(store: AppStore, name?: string) {
  act(() => store.dispatch({ type: 'newQuickSession', start: true, name }));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  stores.splice(0).forEach((store) => store.destroy());
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('useSaveOffer', () => {
  it('should offer a named session in a toast when it pauses', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    startQuick(store, 'Essay');
    advance(12 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));

    expect(screen.getByText('Essay · 12 min')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add to tasks' })).toBeVisible();
  });

  it('should keep the offer, and the tracked time it saves, after the clock is reset', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    startQuick(store, 'Essay');
    advance(12 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await user.click(screen.getByRole('button', { name: 'Add to tasks' }));

    const task = store.getState().data.items.find((item) => item.name === 'Essay');
    expect(task?.kind).toBe('task');
    expect(store.getState().data.sessions).toHaveLength(1);
    expect(store.getState().data.sessions[0].durationMs).toBe(12 * 60_000);
  });

  it('should offer the session again with its new total after a reset and another run', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    startQuick(store, 'Essay');
    advance(12 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    await finishToastExit('Essay · 12 min');
    advance(5 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));

    expect(screen.getByText('Essay · 17 min')).toBeVisible();
  });

  it('should not offer the session when Reset stops a running timer', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    startQuick(store, 'Essay');
    advance(12 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.queryByRole('button', { name: 'Add to tasks' })).not.toBeInTheDocument();
  });

  it('should offer a session after a reset once it runs and pauses again', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    startQuick(store, 'Essay');
    advance(12 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(5 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));

    expect(screen.getByText('Essay · 17 min')).toBeVisible();
  });

  it('should withdraw the offer when the session resumes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    startQuick(store, 'Essay');
    advance(12 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    await finishToastExit('Essay · 12 min');

    await waitFor(() => expect(screen.queryByText('Essay · 12 min')).not.toBeInTheDocument());
  });

  it('should offer a session only once across repeated pauses', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    startQuick(store, 'Essay');
    advance(12 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    await finishToastExit('Essay · 12 min');
    advance(60_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));

    expect(screen.queryByRole('button', { name: 'Add to tasks' })).not.toBeInTheDocument();
  });

  it('should leave one offer when a habit starts while the session is paused', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    act(() =>
      store.dispatch({
        type: 'addItem',
        item: {
          kind: 'habit',
          name: 'Read',

          completion: 'time',
          target: 30,
          timerStyle: 'sessions',
        },
      })
    );
    startQuick(store, 'Essay');
    advance(12 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    const habit = store.getState().data.items.find((item) => item.name === 'Read');
    act(() => store.dispatch({ type: 'start', itemId: habit?.id ?? '' }));
    advance(1000);

    expect(screen.getAllByRole('button', { name: 'Add to tasks' })).toHaveLength(1);
    expect(screen.getByText('Essay · 12 min')).toBeVisible();
  });

  it('should replace the older offer with a newer one', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    startQuick(store, 'Essay');
    advance(12 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    startQuick(store, 'Sketch');
    advance(5 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await finishToastExit('Essay · 12 min');

    await waitFor(() => expect(screen.queryByText('Essay · 12 min')).not.toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: 'Add to tasks' })).toHaveLength(1);
    expect(screen.getByText('Sketch · 5 min')).toBeVisible();
  });

  it('should offer an unnamed session under its default name', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    startQuick(store);
    advance(12 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));

    expect(screen.getByText('Session 1 · 12 min')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add to tasks' })).toBeVisible();
  });

  it('should save the session as a task with its minutes and withdraw the offer', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    startQuick(store, 'Essay');
    advance(12 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await user.click(screen.getByRole('button', { name: 'Add to tasks' }));
    await finishToastExit('Essay · 12 min');

    const { items, sessions } = store.getState().data;
    const saved = items.find((item) => item.name === 'Essay');
    expect(saved?.kind).toBe('task');
    expect(sessions.filter((session) => session.itemId === saved?.id)).toHaveLength(1);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Add to tasks' })).not.toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Resume' })).toBeVisible();
  });
});
