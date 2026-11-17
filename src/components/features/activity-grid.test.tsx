import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Stats } from '@/pages/stats';
import type { AppData, DayKey, DayMark } from '@/domain/types';
import { createStore, STORAGE_KEY, type AppStore } from '@/store/store';
import { AppDataProvider } from '@/store/use-app-data';
import { ActivityGrid } from './activity-grid';

const NOW = new Date(2026, 9, 28, 12, 0, 0).getTime();
const stores: AppStore[] = [];

function seedChecks(days: Array<[DayKey, number]>) {
  const builder = createStore({ storage: window.localStorage, now: () => NOW });
  const names = ['A', 'B', 'C'];
  names.forEach((name) =>
    builder.dispatch({
      type: 'addItem',
      item: { kind: 'habit', name, completion: 'check' },
    })
  );
  const data = builder.getState().data;
  builder.destroy();
  const marks: DayMark[] = days.flatMap(([day, count]) =>
    data.items
      .slice(0, count)
      .map((item) => ({ itemId: item.id, day, count: 1, done: true, updatedAt: NOW }))
  );
  const next: AppData = { ...data, marks };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function Harness({ onSelect }: { onSelect?: (day: DayKey) => void }) {
  const [selected, setSelected] = useState<DayKey | null>(null);
  return (
    <ActivityGrid
      selectedDay={selected}
      onSelectDay={(day) => {
        setSelected(day);
        onSelect?.(day);
      }}
    />
  );
}

function renderWith(ui: React.ReactNode) {
  const store = createStore({ storage: window.localStorage, now: () => NOW });
  stores.push(store);
  return render(<AppDataProvider store={store}>{ui}</AppDataProvider>);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  seedChecks([
    ['2026-10-28', 3],
    ['2026-10-27', 1],
  ]);
});

afterEach(() => {
  stores.splice(0).forEach((store) => store.destroy());
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('ActivityGrid', () => {
  it('should label each day with its activities', () => {
    renderWith(<Harness />);

    expect(screen.getByRole('button', { name: 'October 28: 3 activities' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'October 27: 1 activity' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'October 26: 0 activities' })).toBeTruthy();
  });

  it('should have one tab stop on today', () => {
    renderWith(<Harness />);

    const stops = screen.getAllByRole('button').filter((cell) => cell.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0].getAttribute('aria-label')).toBe('October 28: 3 activities');
  });

  it('should move by day with up and down', async () => {
    const user = userEvent.setup();
    renderWith(<Harness />);

    screen.getByRole('button', { name: 'October 28: 3 activities' }).focus();
    await user.keyboard('{ArrowUp}');

    const moved = screen.getByRole('button', { name: 'October 27: 1 activity' });
    expect(moved).toHaveFocus();
    expect(moved.tabIndex).toBe(0);
    expect(screen.getAllByRole('button').filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
  });

  it('should move by week with left and right', async () => {
    const user = userEvent.setup();
    renderWith(<Harness />);

    screen.getByRole('button', { name: 'October 28: 3 activities' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: 'October 21: 0 activities' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'October 28: 3 activities' })).toHaveFocus();
  });

  it('should stay on today when the next step is in the future', async () => {
    const user = userEvent.setup();
    renderWith(<Harness />);

    screen.getByRole('button', { name: 'October 28: 3 activities' }).focus();
    await user.keyboard('{ArrowRight}{ArrowDown}');

    expect(screen.getByRole('button', { name: 'October 28: 3 activities' })).toHaveFocus();
  });

  it('should select a day with Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWith(<Harness onSelect={onSelect} />);

    screen.getByRole('button', { name: 'October 28: 3 activities' }).focus();
    await user.keyboard('{ArrowUp}{Enter}');

    expect(onSelect).toHaveBeenCalledWith('2026-10-27');
    expect(
      screen.getByRole('button', { name: 'October 27: 1 activity' }).getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('should select a day on click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWith(<Harness onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'October 26: 0 activities' }));

    expect(onSelect).toHaveBeenCalledWith('2026-10-26');
  });

  it('should be absent before anything is tracked', () => {
    window.localStorage.clear();
    renderWith(<Stats />);

    expect(screen.queryByRole('region', { name: 'Activity' })).toBeNull();
  });

  it('should render on Stats with the hash target once tracked', () => {
    renderWith(<Stats />);

    const section = screen.getByRole('region', { name: 'Activity' });
    expect(section.id).toBe('stats-activity');
    expect(section.tabIndex).toBe(-1);
  });
});
