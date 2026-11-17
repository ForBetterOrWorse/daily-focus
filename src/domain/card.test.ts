import { describe, expect, it } from 'vitest';
import { startItem } from './clock';
import { emptyData } from './schema';
import { cardItem, openApp } from './card';
import type { AppData, HabitItem, Item, QuickItem, TaskItem } from './types';

const now = new Date(2024, 0, 3, 9).getTime();
const day = '2024-01-03';
const minute = 60 * 1000;

function timeHabit(id: string, overrides: Partial<HabitItem> = {}): HabitItem {
  return {
    id,
    name: id,
    kind: 'habit',
    completion: 'time',
    goals: [{ from: '2024-01-01', target: 30 }],
    timerStyle: 'free',
    days: [0, 1, 2, 3, 4, 5, 6],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function timeTask(id: string, overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id,
    name: id,
    kind: 'task',
    completion: 'time',
    goals: [{ from: '2024-01-01', target: 30 }],
    timerStyle: 'free',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function quickItem(id = 'quick', overrides: Partial<QuickItem> = {}): QuickItem {
  return {
    id,
    name: '',
    kind: 'quick',
    completion: 'time',
    goals: [],
    timerStyle: 'free',
    number: 1,
    day,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function dataWith(...items: Item[]): AppData {
  const data = emptyData(now);
  return {
    ...data,
    items,
    order: {
      habits: items.filter((item) => item.kind === 'habit').map(({ id }) => id),
      tasks: items.filter((item) => item.kind === 'task').map(({ id }) => id),
    },
  };
}

describe('focus card', () => {
  it('should show the running item before other eligible time items', () => {
    const habit = timeHabit('habit');
    const task = timeTask('task');
    const running = startItem(dataWith(habit, task), task.id, now);

    expect(cardItem(running, day, now)).toBe(task);
  });

  it('should keep a paused pinned quick session ahead of the next time habit', () => {
    const quick = quickItem();
    const data = dataWith(quick, timeHabit('habit'));
    const pinned = {
      ...data,
      cardItemId: quick.id,
      clocks: {
        [quick.id]: {
          style: 'free' as const,
          phase: 'focus' as const,
          round: 1 as const,
          elapsedMs: 5 * minute,
          day,
        },
      },
    };

    expect(cardItem(pinned, day, now)).toBe(quick);
  });

  it('should show a pinned saved task until openApp clears it', () => {
    const habit = timeHabit('habit');
    const task = timeTask('task');
    const data = {
      ...dataWith(habit, task),
      cardItemId: task.id,
    };

    expect(cardItem(data, day, now)).toBe(task);
    const opened = openApp(data, now);
    expect(opened.cardItemId).toBeNull();
    expect(cardItem(opened, day, now)).toBeNull();
  });

  it('should not pick a time item for the card until the user selects one', () => {
    const data = dataWith(timeHabit('habit'), timeTask('task'));

    expect(cardItem(data, day, now)).toBeNull();
  });

  it('should settle a run on load and keep its pinned quick session', () => {
    const quick = quickItem('quick', { timerStyle: 'sessions' });
    const started = startItem({ ...dataWith(quick), cardItemId: quick.id }, quick.id, now);
    const opened = openApp(started, now + 25 * minute);

    expect(opened.run).toBeNull();
    expect(opened.sessions).toHaveLength(1);
    expect(opened.sessions[0]).toMatchObject({
      itemId: quick.id,
      durationMs: 25 * minute,
    });
    expect(opened.cardItemId).toBe(quick.id);
    expect(cardItem(opened, day, now + 25 * minute)).toBe(quick);
  });
});
