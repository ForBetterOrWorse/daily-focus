import { describe, expect, it } from 'vitest';
import { emptyData } from './schema';
import { reduce } from './reduce';
import { weekStats } from './stats';
import type { AppData, HabitItem, Item, QuickItem, Session, TaskItem } from './types';

const minute = 60 * 1000;
const now = new Date(2024, 0, 3, 9).getTime();
const weekStart = '2024-01-01';

function task(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'read',
    name: 'Read',
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
  return { ...task(), kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6], ...overrides };
}

function quick(overrides: Partial<QuickItem> = {}): QuickItem {
  return {
    ...task(),
    id: 'quick',
    name: '',
    kind: 'quick',
    completion: 'time',
    goals: [],
    timerStyle: 'free',
    number: 1,
    day: '2024-01-02',
    ...overrides,
  };
}

function session(itemId: string, day: string, minutes: number): Session {
  return {
    id: `${itemId}-${day}-${minutes}`,
    itemId,
    day,
    startedAt: now,
    durationMs: minutes * minute,
  };
}

function dataWith(items: Item[], sessions: Session[]): AppData {
  return {
    ...emptyData(now),
    items,
    sessions,
  };
}

describe('weekStats', () => {
  it('should total the sessions of the week by item', () => {
    const data = dataWith(
      [
        task({ id: 'read', name: 'Read' }),
        habit({ id: 'run', name: 'Run' }),
        task({ id: 'misc', name: 'Misc' }),
      ],
      [
        session('read', '2024-01-01', 30),
        session('read', '2024-01-07', 15),
        session('run', '2024-01-03', 20),
        session('misc', '2024-01-04', 5),
      ]
    );

    expect(weekStats(data, weekStart)).toEqual({
      totalMs: 70 * minute,
      byItem: [
        { itemId: 'read', name: 'Read', kind: 'task', ms: 45 * minute },
        { itemId: 'run', name: 'Run', kind: 'habit', ms: 20 * minute },
        { itemId: 'misc', name: 'Misc', kind: 'task', ms: 5 * minute },
      ],
    });
  });

  it('should leave out sessions outside the week', () => {
    const data = dataWith(
      [task()],
      [
        session('read', '2023-12-31', 40),
        session('read', '2024-01-02', 10),
        session('read', '2024-01-08', 50),
      ]
    );
    const stats = weekStats(data, weekStart);

    expect(stats.totalMs).toBe(10 * minute);
    expect(stats.byItem).toHaveLength(1);
  });

  it('should list two quick sessions with the same name as two rows', () => {
    const data = dataWith(
      [
        quick({ id: 'q1', name: 'Email', number: 1 }),
        quick({ id: 'q2', name: 'Email', number: 2 }),
      ],
      [session('q1', '2024-01-02', 10), session('q2', '2024-01-03', 20)]
    );
    const stats = weekStats(data, weekStart);

    expect(stats.byItem.map(({ itemId, name, ms }) => ({ itemId, name, ms }))).toEqual([
      { itemId: 'q2', name: 'Email', ms: 20 * minute },
      { itemId: 'q1', name: 'Email', ms: 10 * minute },
    ]);
  });

  it('should show a session saved as a task only under the task', () => {
    const before = dataWith(
      [quick({ id: 'q1', name: 'Email' })],
      [session('q1', '2024-01-02', 10)]
    );
    const saved = reduce(before, { type: 'saveQuickAsTask', itemId: 'q1' }, now);
    const stats = weekStats(saved, weekStart);

    expect(stats.byItem).toEqual([
      { itemId: 'q1', name: 'Email', kind: 'task', ms: 10 * minute },
    ]);
  });

  it('should total quick session time by item', () => {
    const data = dataWith(
      [
        quick({ id: 'q1', name: 'A' }),
        quick({ id: 'q2', name: 'B' }),
        task({ id: 'misc', name: 'Misc' }),
      ],
      [
        session('q1', '2024-01-02', 10),
        session('q2', '2024-01-03', 20),
        session('misc', '2024-01-04', 5),
      ]
    );

    expect(weekStats(data, weekStart).byItem.map(({ ms }) => ms)).toEqual([
      20 * minute,
      10 * minute,
      5 * minute,
    ]);
  });

  it('should sort by time, largest first, then by name', () => {
    const data = dataWith(
      [
        task({ id: 'b', name: 'Beta' }),
        task({ id: 'a', name: 'Alpha' }),
        task({ id: 'c', name: 'Gamma' }),
      ],
      [
        session('b', '2024-01-02', 10),
        session('a', '2024-01-02', 10),
        session('c', '2024-01-02', 30),
      ]
    );

    expect(weekStats(data, weekStart).byItem.map(({ name }) => name)).toEqual([
      'Gamma',
      'Alpha',
      'Beta',
    ]);
  });

  it('should return empty lists for a week without sessions', () => {
    expect(weekStats(dataWith([task()], []), weekStart)).toEqual({
      totalMs: 0,
      byItem: [],
    });
  });
});
