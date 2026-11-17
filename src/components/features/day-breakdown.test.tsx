import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppData, DayKey, DayMark, Session } from '@/domain/types';
import { createStore, STORAGE_KEY, type AppStore } from '@/store/store';
import { AppDataProvider } from '@/store/use-app-data';
import { ActivityGrid } from './activity-grid';
import { DayBreakdown } from './day-breakdown';

const NOW = new Date(2026, 9, 28, 12, 0, 0).getTime();
const MINUTE = 60_000;
const TODAY = '2026-10-28';
const stores: AppStore[] = [];

function withActivityOn(day: DayKey) {
  return (data: AppData): Partial<AppData> => ({
    marks: [
      ...data.marks,
      {
        itemId: data.items.find((item) => item.name === 'Stretch')!.id,
        day,
        count: 1,
        done: true,
        updatedAt: NOW,
      },
    ],
  });
}

function seed(patch: (data: AppData) => Partial<AppData> = () => ({})) {
  const builder = createStore({ storage: window.localStorage, now: () => NOW });
  builder.dispatch({
    type: 'addItem',
    item: { kind: 'habit', name: 'Read', completion: 'time', target: 30 },
  });
  builder.dispatch({
    type: 'addItem',
    item: { kind: 'habit', name: 'Stretch', completion: 'check' },
  });
  builder.dispatch({
    type: 'addItem',
    item: { kind: 'task', name: 'Write report', completion: 'check' },
  });
  builder.dispatch({ type: 'newQuickSession', start: false, name: '' });
  const data = builder.getState().data;
  builder.destroy();
  const [read, stretch, report, quick] = data.items;
  const sessions: Session[] = [
    { id: 's1', itemId: read.id, day: TODAY, startedAt: NOW, durationMs: 20 * MINUTE },
    { id: 's2', itemId: read.id, day: TODAY, startedAt: NOW, durationMs: 15 * MINUTE },
    { id: 's3', itemId: quick.id, day: TODAY, startedAt: NOW, durationMs: 12 * MINUTE },
  ];
  const marks: DayMark[] = [stretch, report].map((item) => ({
    itemId: item.id,
    day: TODAY,
    count: 1,
    done: true,
    updatedAt: NOW,
  }));
  const next: AppData = { ...data, sessions, marks };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, ...patch(next) }));
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function cell(day: DayKey): HTMLElement {
  const [, month, date] = day.split('-').map(Number);
  const cells = screen.getAllByRole('button', {
    name: new RegExp(`^${MONTHS[month - 1]} ${date}:`),
  });
  return cells[cells.length - 1];
}

function Harness() {
  const [selected, setSelected] = useState<DayKey | null>(null);
  return (
    <>
      <ActivityGrid selectedDay={selected} onSelectDay={setSelected} />
      <DayBreakdown selectedDay={selected} />
    </>
  );
}

function mountHarness() {
  const store = createStore({ storage: window.localStorage, now: () => NOW });
  stores.push(store);
  render(
    <AppDataProvider store={store}>
      <Harness />
    </AppDataProvider>
  );
  return store;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  stores.splice(0).forEach((store) => store.destroy());
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('DayBreakdown', () => {
  it('should list the selected day with time per item by display name', async () => {
    seed();
    mountHarness();

    await userEvent.setup().click(cell(TODAY));

    expect(screen.getByRole('heading', { name: 'Today, October 28 · 4 activities' })).toBeVisible();
    expect(screen.getByText('Read · 35 min')).toBeVisible();
    expect(screen.getByText('Stretch')).toBeVisible();
    expect(screen.getByText('Write report · Done')).toBeVisible();
    expect(screen.getByText('Session 1 · 12 min')).toBeVisible();
  });

  it('should show only the activity count for an empty day', async () => {
    seed();
    mountHarness();

    await userEvent.setup().click(cell('2026-09-30'));

    expect(screen.getByRole('heading', { name: 'September 30 · 0 activities' })).toBeVisible();
    expect(screen.queryByText('No activity.')).toBeNull();
  });

  it('should offer a skip on yesterday when the day before it has activity', async () => {
    seed(withActivityOn('2026-10-26'));
    mountHarness();

    await userEvent.setup().click(cell('2026-10-27'));

    expect(screen.getByRole('complementary', { name: 'Skip' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Use a skip (2 left this month)' })).toBeVisible();
  });

  it('should use a skip from the banner and update the allowance', async () => {
    const user = userEvent.setup();
    seed(withActivityOn('2026-10-26'));
    const store = mountHarness();

    await user.click(cell('2026-10-27'));
    await user.click(screen.getByRole('button', { name: 'Use a skip (2 left this month)' }));

    expect(store.getState().data.skips).toEqual(['2026-10-27']);
    expect(screen.getByText('Skipped. The streak continues through this day.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Use a skip/ })).toBeNull();
  });

  it('should explain that no skips are left instead of offering one', async () => {
    seed((data) => ({
      ...withActivityOn('2026-10-26')(data),
      skips: ['2026-10-05', '2026-10-06'],
    }));
    mountHarness();

    await userEvent.setup().click(cell('2026-10-27'));

    expect(screen.getByText('No skips left this month.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Use a skip/ })).toBeNull();
  });

  it('should not offer a skip on today or on a day older than yesterday', async () => {
    seed(withActivityOn('2026-10-26'));
    mountHarness();

    const user = userEvent.setup();
    await user.click(cell(TODAY));
    expect(screen.queryByRole('complementary', { name: 'Skip' })).toBeNull();

    await user.click(cell('2026-10-25'));
    expect(screen.queryByRole('complementary', { name: 'Skip' })).toBeNull();
  });
});
