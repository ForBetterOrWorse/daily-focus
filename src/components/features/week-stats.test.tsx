import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemInput } from '@/domain/items';
import type { AppData, Session } from '@/domain/types';
import { createStore, STORAGE_KEY, type AppStore } from '@/store/store';
import { AppDataProvider } from '@/store/use-app-data';
import { WeekStats } from './week-stats';

const NOW = new Date(2026, 9, 28, 12, 0, 0).getTime();
const MINUTE = 60_000;
const stores: AppStore[] = [];

function session(id: string, itemId: string, day: string, minutes: number): Session {
  return { id, itemId, day, startedAt: NOW, durationMs: minutes * MINUTE };
}

function seed(items: ItemInput[], sessionsFor: (ids: string[]) => Session[]) {
  const builder = createStore({ storage: window.localStorage, now: () => NOW });
  items.forEach((item) => builder.dispatch({ type: 'addItem', item }));
  const data = builder.getState().data;
  const ids = data.items.map((item) => item.id);
  builder.destroy();
  const next: AppData = { ...data, sessions: sessionsFor(ids) };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function renderStats() {
  const store = createStore({ storage: window.localStorage, now: () => NOW });
  stores.push(store);
  return render(
    <AppDataProvider store={store}>
      <WeekStats />
    </AppDataProvider>
  );
}

const habit: ItemInput = {
  kind: 'habit',
  name: 'Read',
  completion: 'time',
  target: 30,
  timerStyle: 'free',
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  stores.splice(0).forEach((store) => store.destroy());
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('WeekStats', () => {
  it('should move by a week with previous and next', async () => {
    const user = userEvent.setup();
    seed([habit], ([id]) => [
      session('s1', id, '2026-10-28', 20),
      session('s2', id, '2026-10-21', 45),
    ]);
    renderStats();

    expect(screen.getByText('This week')).toBeVisible();
    expect(screen.getAllByText('20 min')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(
      within(screen.getByRole('group', { name: 'Week' })).getByText('Oct 19 to Oct 25')
    ).toBeVisible();
    expect(screen.getAllByText('45 min')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.getByText('This week')).toBeVisible();
  });

  it('should keep next out of reach during the current week', async () => {
    const user = userEvent.setup();
    seed([habit], ([id]) => [session('s1', id, '2026-10-28', 20)]);
    renderStats();

    const next = screen.getByRole('button', { name: 'Next week', hidden: true });
    expect(next).toHaveAttribute('inert');
    await user.click(next);
    expect(screen.getByText('This week')).toBeVisible();
  });

  it('should move focus to previous when next returns to the current week', async () => {
    const user = userEvent.setup();
    seed([habit], ([id]) => [session('s1', id, '2026-10-21', 45)]);
    renderStats();

    await user.click(screen.getByRole('button', { name: 'Previous week' }));
    await user.click(screen.getByRole('button', { name: 'Next week' }));

    expect(screen.getByText('This week')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Previous week' })).toHaveFocus();
  });

  it('should show the empty state with previous disabled on a first visit', async () => {
    const user = userEvent.setup();
    renderStats();

    expect(screen.getByText(/No time tracked yet\./)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/');
    const previous = screen.getByRole('button', { name: 'Previous week' });
    expect(previous).toHaveAttribute('aria-disabled', 'true');
    await user.click(previous);
    expect(screen.getByText('This week')).toBeVisible();
  });

  it('should show an empty message for a week with no time', async () => {
    const user = userEvent.setup();
    seed([habit], ([id]) => [session('s1', id, '2026-10-21', 45)]);
    renderStats();

    await user.click(screen.getByRole('button', { name: 'Previous week' }));
    await user.click(screen.getByRole('button', { name: 'Previous week' }));

    expect(
      within(screen.getByRole('group', { name: 'Week' })).getByText('Oct 12 to Oct 18')
    ).toBeVisible();
    expect(screen.queryByRole('table', { name: 'By task and habit' })).not.toBeInTheDocument();
    expect(screen.getByText('No time tracked in this range.')).toBeVisible();
  });

  it('should render a table with header cells and item rows', () => {
    seed([habit], ([id]) => [session('s1', id, '2026-10-28', 20)]);
    renderStats();

    const byItem = screen.getByRole('table', { name: 'By task and habit' });
    expect(within(byItem).getAllByRole('columnheader', { hidden: true })).toHaveLength(2);
    expect(within(byItem).getByRole('rowheader', { name: /Read/ })).toHaveTextContent('Habit');
  });
});
