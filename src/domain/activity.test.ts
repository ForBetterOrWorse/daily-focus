import { describe, expect, it } from 'vitest';
import {
  activitiesOn,
  buildGrid,
  hasTracked,
  isSkipOffered,
  isSkipped,
  levelOf,
  skipsLeft,
  streak,
  skipDay,
} from './activity';
import { addDays } from './days';
import { reduce } from './reduce';
import { emptyData } from './schema';
import type { AppData, DayMark, HabitItem, Item, QuickItem, Session, TaskItem } from './types';

const minute = 60 * 1000;
const now = new Date(2024, 0, 17, 9).getTime();
const today = '2024-01-17';

function task(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'essay',
    name: 'Essay',
    kind: 'task',
    completion: 'time',
    goals: [{ from: '2024-01-01', target: 30 }],
    timerStyle: 'free',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function habit(overrides: Partial<HabitItem> = {}): HabitItem {
  return {
    ...task({ id: 'stretch', name: 'Stretch', completion: 'check', goals: [] }),
    kind: 'habit',
    days: [0, 1, 2, 3, 4, 5, 6],
    ...overrides,
  };
}

function quick(id: string, overrides: Partial<QuickItem> = {}): QuickItem {
  return {
    ...task({ id, name: 'Essay' }),
    goals: [],
    kind: 'quick',
    completion: 'time',

    timerStyle: 'free',
    number: 1,
    day: today,
    ...overrides,
  };
}

function session(
  itemId: string,
  day: string,
  minutes: number,
  id = `${itemId}-${day}-${minutes}`
): Session {
  return { id, itemId, day, startedAt: now, durationMs: minutes * minute };
}

function mark(itemId: string, day: string, overrides: Partial<DayMark> = {}): DayMark {
  return { itemId, day, count: 0, done: true, updatedAt: now, ...overrides };
}

function dataWith(parts: Partial<AppData> & { items?: Item[] } = {}): AppData {
  return { ...emptyData(now), ...parts };
}

function activeDays(days: string[]): AppData {
  return dataWith({
    items: [habit()],
    marks: days.map((day) => mark('stretch', day)),
  });
}

describe('hasTracked', () => {
  it('should be false for empty data', () => {
    expect(hasTracked(dataWith())).toBe(false);
  });

  it('should be true with any session', () => {
    expect(hasTracked(dataWith({ sessions: [session('essay', today, 1)] }))).toBe(true);
  });

  it('should be true with any mark', () => {
    expect(hasTracked(dataWith({ marks: [mark('stretch', today)] }))).toBe(true);
  });
});

describe('activitiesOn', () => {
  it('should count a habit whose goal is met that day', () => {
    const counted = habit({
      id: 'water',
      completion: 'count',
      goals: [{ from: '2024-01-01', target: 3 }],
    });
    const data = dataWith({
      items: [counted, habit()],
      marks: [mark('water', today, { count: 3, done: false })],
    });
    expect(activitiesOn(data, today).map(({ id }) => id)).toEqual(['water']);
  });

  it('should not count a habit short of its goal', () => {
    const counted = habit({
      id: 'water',
      completion: 'count',
      goals: [{ from: '2024-01-01', target: 3 }],
    });
    const data = dataWith({
      items: [counted],
      marks: [mark('water', today, { count: 2, done: false })],
    });
    expect(activitiesOn(data, today)).toEqual([]);
  });

  it('should count a task with 10 minutes summed across sessions', () => {
    const data = dataWith({
      items: [task()],
      sessions: [session('essay', today, 4, 'a'), session('essay', today, 6, 'b')],
    });
    expect(activitiesOn(data, today)).toHaveLength(1);
  });

  it('should not count a task with under 10 minutes', () => {
    const data = dataWith({ items: [task()], sessions: [session('essay', today, 9)] });
    expect(activitiesOn(data, today)).toEqual([]);
  });

  it('should count only the sessions of the given day', () => {
    const data = dataWith({
      items: [task()],
      sessions: [session('essay', today, 6, 'a'), session('essay', addDays(today, -1), 6, 'b')],
    });
    expect(activitiesOn(data, today)).toEqual([]);
  });

  it('should count a task marked done', () => {
    const data = dataWith({
      items: [task({ completion: 'check', goals: [] })],
      marks: [mark('essay', today)],
    });
    expect(activitiesOn(data, today)).toHaveLength(1);
  });

  it('should count a task with minutes and a done mark once', () => {
    const data = dataWith({
      items: [task()],
      sessions: [session('essay', today, 12)],
      marks: [mark('essay', today)],
    });
    expect(activitiesOn(data, today)).toHaveLength(1);
  });

  it('should count a quick session with 10 minutes', () => {
    const data = dataWith({ items: [quick('q1')], sessions: [session('q1', today, 10)] });
    expect(activitiesOn(data, today)).toHaveLength(1);
  });

  it('should count two quick sessions named Essay with 10 minutes each as two activities', () => {
    const data = dataWith({
      items: [quick('q1'), quick('q2', { number: 2 })],
      sessions: [session('q1', today, 10), session('q2', today, 10)],
    });
    expect(activitiesOn(data, today)).toHaveLength(2);
  });

  it('should not sum minutes of two quick sessions with the same name', () => {
    const data = dataWith({
      items: [quick('q1'), quick('q2', { number: 2 })],
      sessions: [session('q1', today, 6), session('q2', today, 6)],
    });
    expect(activitiesOn(data, today)).toEqual([]);
  });
});

describe('levelOf', () => {
  it('should map counts to levels 0 through 4', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 9].map(levelOf)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe('streak', () => {
  it('should be 0 without any tracking', () => {
    expect(streak(dataWith(), today)).toBe(0);
  });

  it('should count consecutive active days ending today', () => {
    expect(streak(activeDays([today, addDays(today, -1), addDays(today, -2)]), today)).toBe(3);
  });

  it('should not break on an empty today', () => {
    expect(streak(activeDays([addDays(today, -1), addDays(today, -2)]), today)).toBe(2);
  });

  it('should break on an empty past day', () => {
    expect(streak(activeDays([today, addDays(today, -2)]), today)).toBe(1);
  });

  it('should continue over a skipped day without adding to it', () => {
    const data = { ...activeDays([today, addDays(today, -2)]), skips: [addDays(today, -1)] };
    expect(streak(data, today)).toBe(2);
  });
});

describe('skips', () => {
  const yesterday = addDays(today, -1);

  it('should default to 2 skips a month', () => {
    expect(skipsLeft(dataWith(), '2024-01')).toBe(2);
  });

  it('should reduce the skips left by each skip in that month', () => {
    const data = dataWith({ skips: ['2024-01-05', '2023-12-30'] });
    expect(skipsLeft(data, '2024-01')).toBe(1);
  });

  it('should skip yesterday when the day before it has activity', () => {
    const data = activeDays([addDays(yesterday, -1)]);
    expect(skipDay(data, yesterday, now).skips).toEqual([yesterday]);
  });

  it('should refuse a skip once none are left', () => {
    const data = { ...activeDays([addDays(yesterday, -1)]), skips: ['2024-01-02', '2024-01-03'] };
    expect(skipDay(data, yesterday, now)).toBe(data);
  });

  it('should refuse a skip on today, a future day, or a day already skipped', () => {
    const data = { ...activeDays([addDays(yesterday, -1)]), skips: [yesterday] };
    expect(skipDay(data, today, now)).toBe(data);
    expect(skipDay(data, addDays(today, 1), now)).toBe(data);
    expect(skipDay(data, yesterday, now)).toBe(data);
  });

  it('should refuse a day that has activity', () => {
    const data = activeDays([yesterday, addDays(yesterday, -1)]);
    expect(skipDay(data, yesterday, now)).toBe(data);
  });

  it('should keep the streak over a skip on an empty past day, and logging that day returns the skip', () => {
    const base = activeDays([today, addDays(today, -2)]);
    const skipped = reduce(base, { type: 'useSkip', day: yesterday }, now);
    expect(streak(skipped, today)).toBe(2);
    expect(skipsLeft(skipped, '2024-01')).toBe(1);

    const logged = {
      ...skipped,
      marks: [...skipped.marks, mark('stretch', yesterday)],
    };
    expect(skipsLeft(logged, '2024-01')).toBe(2);
    expect(streak(logged, today)).toBe(3);
  });

  it('should remove the skip from the data when a reduce action logs that day', () => {
    const timed = habit({
      id: 'run',
      completion: 'time',
      goals: [{ from: '2024-01-01', target: 30 }],
    });
    const data = dataWith({ items: [timed], skips: [today] });
    const logged = reduce(data, { type: 'markDone', itemId: 'run' }, now);
    expect(logged.skips).toEqual([]);
    expect(skipsLeft(logged, '2024-01')).toBe(2);
  });
});

describe('isSkipOffered', () => {
  const yesterday = addDays(today, -1);
  const streakBeforeYesterday = activeDays([addDays(yesterday, -1)]);

  it('should offer a skip on yesterday after an active day', () => {
    expect(isSkipOffered(streakBeforeYesterday, yesterday, today)).toBe(true);
  });

  it.each([
    ['today', today],
    ['two days ago', addDays(yesterday, -1)],
    ['a future day', addDays(today, 1)],
  ])('should not offer a skip on %s', (_, day) => {
    expect(isSkipOffered(streakBeforeYesterday, day, today)).toBe(false);
  });

  it('should not offer a skip when the day before yesterday is also empty', () => {
    expect(isSkipOffered(dataWith(), yesterday, today)).toBe(false);
  });

  it('should not offer a skip when yesterday has activity', () => {
    const data = activeDays([yesterday, addDays(yesterday, -1)]);
    expect(isSkipOffered(data, yesterday, today)).toBe(false);
  });

  it('should not offer a skip when yesterday is already skipped', () => {
    const skipped = { ...streakBeforeYesterday, skips: [yesterday] };
    expect(isSkipOffered(skipped, yesterday, today)).toBe(false);
  });

  it('should not offer a skip on the last day of the previous month', () => {
    const firstOfMonth = '2024-01-01';
    const lastOfPreviousMonth = '2023-12-31';
    const data = activeDays(['2023-12-30']);
    expect(isSkipOffered(data, lastOfPreviousMonth, firstOfMonth)).toBe(false);
  });
});

describe('buildGrid', () => {
  it('should build 53 weeks of 7 cells starting on the week start', () => {
    const grid = buildGrid(dataWith(), today, 'monday');
    expect(grid).toHaveLength(53);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[0][0].day).toBe('2023-01-16');
    expect(grid[52][0].day).toBe('2024-01-15');
  });

  it('should start weeks on Sunday when asked', () => {
    const grid = buildGrid(dataWith(), today, 'sunday');
    expect(grid[52][0].day).toBe('2024-01-14');
  });

  it('should mark days after today as future with no activity', () => {
    const grid = buildGrid(activeDays([today]), today, 'monday').flat();
    const future = grid.filter((cell) => cell.future);
    expect(future.map(({ day }) => day)).toEqual([
      '2024-01-18',
      '2024-01-19',
      '2024-01-20',
      '2024-01-21',
    ]);
    expect(future.every((cell) => cell.count === 0 && cell.level === 0)).toBe(true);
  });

  it('should give each cell its activity count and level', () => {
    const data = dataWith({
      items: [habit(), quick('q1'), quick('q2', { number: 2 })],
      marks: [mark('stretch', today)],
      sessions: [session('q1', today, 10), session('q2', today, 10)],
    });
    const cell = buildGrid(data, today, 'monday')
      .flat()
      .find(({ day }) => day === today);
    expect(cell).toEqual({ day: today, count: 3, level: 2, future: false });
  });
});

describe('isSkipped', () => {
  it('should be true for a skipped day without activity', () => {
    expect(isSkipped(dataWith({ skips: ['2024-01-10'] }), '2024-01-10')).toBe(true);
  });

  it('should be false for a skipped day that has activity', () => {
    const data = { ...activeDays(['2024-01-10']), skips: ['2024-01-10'] };
    expect(isSkipped(data, '2024-01-10')).toBe(false);
  });

  it('should be false for a day that is not skipped', () => {
    expect(isSkipped(dataWith(), '2024-01-10')).toBe(false);
  });
});
