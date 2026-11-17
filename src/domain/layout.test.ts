import { describe, expect, it } from 'vitest';
import { columnsShown } from './layout';
import { reduce } from './reduce';
import { emptyData } from './schema';
import type { AppData, HabitItem, QuickItem, TaskItem } from './types';

const now = new Date(2024, 0, 3, 9).getTime();

function habit(): HabitItem {
  return {
    id: 'habit',
    name: 'Stretch',
    kind: 'habit',
    completion: 'check',
    goals: [],
    days: [0, 1, 2, 3, 4, 5, 6],
    createdAt: now,
    updatedAt: now,
  };
}

function task(): TaskItem {
  return {
    id: 'task',
    name: 'Write report',
    kind: 'task',
    completion: 'check',
    goals: [],
    createdAt: now,
    updatedAt: now,
  };
}

function quick(): QuickItem {
  return {
    id: 'quick',
    name: '',
    kind: 'quick',
    completion: 'time',
    goals: [],
    timerStyle: 'free',
    number: 1,
    day: '2024-01-03',
    createdAt: now,
    updatedAt: now,
  };
}

function withItems(items: AppData['items'], columnsOpen: boolean | null = null): AppData {
  const data = emptyData(now);
  return { ...data, items, meta: { ...data.meta, columnsOpen } };
}

describe('columnsShown', () => {
  it('should close the columns when there are no items and no preference', () => {
    expect(columnsShown(emptyData(now))).toBe(false);
  });

  it('should open the columns when there is one habit', () => {
    expect(columnsShown(withItems([habit()]))).toBe(true);
  });

  it('should open the columns when there is one task', () => {
    expect(columnsShown(withItems([task()]))).toBe(true);
  });

  it('should keep the columns closed when a quick session is the only item', () => {
    expect(columnsShown(withItems([quick()]))).toBe(false);
  });

  it('should let a stored false win over items', () => {
    expect(columnsShown(withItems([habit(), task()], false))).toBe(false);
  });

  it('should let a stored true win when there are no items', () => {
    expect(columnsShown(withItems([], true))).toBe(true);
  });
});

describe('reduce setColumnsOpen action', () => {
  it('should set meta.columnsOpen to the requested value', () => {
    const closed = reduce(emptyData(now), { type: 'setColumnsOpen', open: true }, now);
    expect(closed.meta.columnsOpen).toBe(true);

    const reopened = reduce(closed, { type: 'setColumnsOpen', open: false }, now);
    expect(reopened.meta.columnsOpen).toBe(false);
  });
});
