import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/base/toast/toast';
import { cardItem } from '@/domain/card';
import { dayKeyOf } from '@/domain/days';
import type { ItemInput } from '@/domain/items';
import { createStore, type AppStore } from '@/store/store';
import { AppDataProvider, useAppData, useNow } from '@/store/use-app-data';
import { FocusCard } from './focus-card';
import { LiveAnnouncerProvider } from './live-announcer';

const START = new Date(2026, 9, 28, 12, 0, 0).getTime();
const MINUTE = 60_000;
const stores: AppStore[] = [];
let unmountLast = () => {};

function CardHarness() {
  const data = useAppData((value) => value);
  const now = useNow(1000);
  const item = cardItem(data, dayKeyOf(now, data.settings.dayStartHour), now);
  return <FocusCard item={item} now={now} />;
}

function timeItem(name: string, timerStyle: 'sessions' | 'free' = 'sessions'): ItemInput {
  return { kind: 'habit', name, completion: 'time', target: 30, timerStyle };
}

function setup(...items: ItemInput[]) {
  const store = createStore({ storage: window.localStorage, now: Date.now });
  stores.push(store);
  items.forEach((item) => store.dispatch({ type: 'addItem', item }));
  const { data } = store.getState();
  store.dispatch({ type: 'restore', snapshot: { ...data, cardItemId: data.items[0]?.id ?? null } });
  const { unmount } = render(
    <AppDataProvider store={store}>
      <ToastProvider>
        <LiveAnnouncerProvider>
          <CardHarness />
        </LiveAnnouncerProvider>
      </ToastProvider>
    </AppDataProvider>
  );
  unmountLast = unmount;
  return store;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function idOf(store: AppStore, name: string): string {
  const item = store.getState().data.items.find((candidate) => candidate.name === name);
  if (!item) {
    throw new Error(`No item named ${name}`);
  }
  return item.id;
}

beforeEach(() => {
  vi.useFakeTimers({ now: START, shouldAdvanceTime: true });
});

afterEach(() => {
  stores.splice(0).forEach((store) => store.destroy());
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('FocusCard', () => {
  it('should hold the next time item at its starting clock before it runs', () => {
    setup(timeItem('Read'));
    expect(screen.getByRole('region', { name: 'Timer' })).toBeVisible();
    expect(screen.getByText('Read')).toBeVisible();
    expect(screen.getByText('25:00')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Focus 1 of 4' })).toBeInTheDocument();
  });

  it('should count a free run up from zero without a session row', () => {
    setup(timeItem('Read', 'free'));
    expect(screen.getByText('0:00')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible();
  });

  it('should show hours in a free run only after the first hour', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setup(timeItem('Read', 'free'));

    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(59 * MINUTE + 59_000);
    expect(screen.getByText('59:59')).toBeVisible();

    advance(1000);
    expect(screen.getByText('1:00:00')).toBeVisible();
  });

  it('should start and pause from the hero and announce each change without the seconds', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setup(timeItem('Read'));

    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(100);
    expect(screen.getByRole('status')).toHaveTextContent('Read started.');

    advance(5000);
    expect(screen.getByText('24:55')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Read started.');

    await user.click(screen.getByRole('button', { name: 'Pause' }));
    advance(100);
    expect(screen.getByRole('status')).toHaveTextContent('Read paused.');

    await user.click(screen.getByRole('button', { name: 'Resume' }));
    advance(100);
    expect(screen.getByRole('status')).toHaveTextContent('Read resumed.');
  });

  it('should offer Reset only once the timer has run and reset it to its starting clock', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setup(timeItem('Read'));
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(5000);
    expect(screen.getByRole('button', { name: 'Reset' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    advance(100);
    expect(screen.getByText('25:00')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Read reset.');
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  });

  it('should start and pause with Shift+S', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setup(timeItem('Read'));

    await user.keyboard('{Shift>}s{/Shift}');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeVisible();

    await user.keyboard('{Shift>}s{/Shift}');
    expect(screen.getByRole('button', { name: 'Resume' })).toBeVisible();
  });

  it('should ignore Shift+S while typing in a field', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setup(timeItem('Read'));
    const field = document.createElement('input');
    document.body.append(field);

    field.focus();
    await user.keyboard('{Shift>}s{/Shift}');
    field.remove();

    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible();
  });

  it('should move the card to the item that starts and keep the first item clock', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup(timeItem('Read'), timeItem('Write'));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(5 * MINUTE);

    act(() => store.dispatch({ type: 'start', itemId: idOf(store, 'Write') }));
    advance(1000);
    expect(screen.getByText('Write')).toBeVisible();
    expect(screen.queryByText('Read')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeVisible();
    advance(100);
    expect(screen.getByRole('status')).toHaveTextContent('Read paused. Write started.');

    act(() => store.dispatch({ type: 'start', itemId: idOf(store, 'Read') }));
    advance(1000);
    expect(screen.getByText('Read')).toBeVisible();
    expect(screen.getByText(/^(20:00|19:5\d)$/)).toBeVisible();
  });

  it('should stay silent when an interval end settles and show the next phase', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup(timeItem('Read'));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(100);
    expect(screen.getByRole('status')).toHaveTextContent('Read started.');

    advance(25 * MINUTE + 1000);
    act(() => store.dispatch({ type: 'settle' }));
    advance(100);

    expect(screen.getByRole('status')).toHaveTextContent('Read started.');
    expect(screen.getByRole('status')).not.toHaveTextContent('done');
    expect(store.getState().data.run).toBeNull();
    expect(screen.getByRole('img', { name: 'Break after focus 1 of 4' })).toBeInTheDocument();
    expect(screen.getByText('5:00')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible();
  });

  it('should show a done toast and restore the item with Undo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup(timeItem('Read'));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(2 * MINUTE);

    await user.click(screen.getByRole('button', { name: 'Mark done' }));
    expect(screen.getByText('Read done')).toBeVisible();
    expect(screen.queryByText('Read')).not.toBeInTheDocument();
    expect(store.getState().data.run).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('region', { name: 'Timer' })).toBeVisible();
    expect(screen.getByText('Read')).toBeVisible();
    expect(store.getState().data.run?.itemId).toBe(idOf(store, 'Read'));
  });

  it('should leave the group name off the card', () => {
    const store = createStore({ storage: window.localStorage, now: Date.now });
    stores.push(store);
    store.dispatch({ type: 'addItem', item: timeItem('Read') });
    const { data } = store.getState();
    store.dispatch({ type: 'restore', snapshot: { ...data, cardItemId: data.items[0].id } });
    render(
      <AppDataProvider store={store}>
        <ToastProvider>
          <LiveAnnouncerProvider>
            <CardHarness />
          </LiveAnnouncerProvider>
        </ToastProvider>
      </AppDataProvider>
    );
    expect(screen.getByText('Read')).toBeVisible();
    expect(screen.queryByText('Work')).not.toBeInTheDocument();
  });

  it('should hold a fresh quick session in Free run when no time item exists', () => {
    setup();
    expect(screen.getByRole('region', { name: 'Timer' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveAttribute(
      'placeholder',
      'Session 1'
    );
    expect(screen.getByText('0:00')).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Free run' })).toBeChecked();
    expect(screen.getByRole('group', { name: 'Timer style' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Mark done' })).not.toBeInTheDocument();
  });

  it('should start timing a fresh quick session with one press', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();

    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(5000);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeVisible();
    expect(screen.getByText('0:05')).toBeVisible();
    expect(store.getState().data.items[0]).toMatchObject({ kind: 'quick', number: 1 });
  });

  it('should keep typing, spaces and focus while the first keystroke creates the session', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    const field = screen.getByRole('textbox', { name: 'Session name' });

    await user.type(field, 'Deep work');

    expect(field).toHaveFocus();
    expect(field).toHaveValue('Deep work');
    expect(store.getState().data.items[0]).toMatchObject({ kind: 'quick', name: 'Deep work' });
    expect(store.getState().data.run).toBeNull();
  });

  it('should keep a typed name after a reload', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setup();
    await user.type(screen.getByRole('textbox', { name: 'Session name' }), 'Deep work');
    unmountLast();
    stores.splice(0).forEach((store) => store.destroy());

    setup();

    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveValue('Deep work');
  });

  it('should create the session in the chosen style from a fresh card', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();

    await user.click(screen.getByRole('radio', { name: 'Focus sessions' }));
    advance(100);

    expect(screen.getByRole('radio', { name: 'Focus sessions' })).toBeChecked();
    expect(screen.getByText('25:00')).toBeVisible();
    expect(store.getState().data.items[0]).toMatchObject({ kind: 'quick', timerStyle: 'sessions' });
    expect(store.getState().data.meta.quickStyle).toBe('sessions');
    expect(screen.getByRole('status')).toHaveTextContent('Focus sessions, 25:00');
  });

  it('should restart the clock, keep it running, and announce when the style changes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(10_000);

    await user.click(screen.getByRole('radio', { name: 'Focus sessions' }));
    advance(100);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeVisible();
    expect(screen.getByText(/^(25:00|24:5\d)$/)).toBeVisible();
    expect(store.getState().data.run).not.toBeNull();
    expect(store.getState().data.sessions).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Focus sessions, 25:00');

    await user.click(screen.getByRole('radio', { name: 'Free run' }));
    advance(100);
    expect(screen.getByRole('status')).toHaveTextContent('Free run, 0:00');
  });

  it('should show the pinned quick session name and style on the card', async () => {
    const store = setup();
    act(() => store.dispatch({ type: 'newQuickSession', start: false, name: 'Sketch' }));
    advance(1000);

    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveValue('Sketch');
  });

  it('should pause a running item, start a quick session, and focus its name on Start a quick session', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup(timeItem('Read'));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(2 * MINUTE);

    await user.click(screen.getByRole('button', { name: 'Start a quick session' }));
    advance(100);

    const quick = store.getState().data.items.find((item) => item.kind === 'quick');
    expect(store.getState().data.run?.itemId).toBe(quick?.id);
    expect(store.getState().data.clocks[idOf(store, 'Read')].elapsedMs).toBeGreaterThanOrEqual(
      2 * MINUTE
    );
    expect(screen.getByRole('button', { name: 'Pause' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveFocus();
  });

  it('should hide Start a quick session when the card holds a quick session or no item', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setup();
    expect(screen.queryByRole('button', { name: 'Start a quick session' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Free run' })).toBeVisible();
    unmountLast();
    stores.splice(0).forEach((store) => store.destroy());

    setup(timeItem('Read'));
    await user.click(screen.getByRole('button', { name: 'Start a quick session' }));
    advance(100);
    expect(screen.queryByRole('button', { name: 'Start a quick session' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Free run' })).toBeVisible();
  });

  it('should return Read to the card with its clock when Read starts again', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup(timeItem('Read'));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(2 * MINUTE);
    await user.click(screen.getByRole('button', { name: 'Start a quick session' }));
    advance(100);
    const quickId = store.getState().data.cardItemId;

    act(() => store.dispatch({ type: 'start', itemId: idOf(store, 'Read') }));
    advance(1000);

    expect(screen.getByText('Read')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Session name' })).not.toBeInTheDocument();
    expect(store.getState().data.cardItemId).not.toBe(quickId);
    expect(store.getState().data.run?.itemId).toBe(idOf(store, 'Read'));
  });

  it('should keep the card when the last time item is marked done', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setup(timeItem('Read'));

    await user.click(screen.getByRole('button', { name: 'Mark done' }));

    expect(screen.getByRole('region', { name: 'Timer' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveValue('');
  });
});
