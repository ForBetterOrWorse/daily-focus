import { describe, expect, it } from 'vitest';
import { addDays } from './days';
import { emptyData } from './schema';
import { amountOn, displayName, goalOn, historyOf, isDoneOn, scheduledOn } from './items';
import { reduce } from './reduce';
import type { AppData, HabitItem, Item, QuickItem, TaskItem } from './types';

const minute = 60 * 1000;
const now = new Date(2024, 0, 3, 9).getTime();
const today = '2024-01-03';
const yesterday = addDays(today, -1);

function task(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'read',
    name: 'Read',
    kind: 'task',
    groupId: null,
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
    ...task(),
    kind: 'habit',
    days: [0, 1, 2, 3, 4, 5, 6],
    ...overrides,
  };
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
    groupId: null,
    number: 3,
    day: today,
    ...overrides,
  };
}

function dataWith(...items: Item[]): AppData {
  const data = emptyData(now);
  return {
    ...data,
    items,
    order: {
      habits: items.filter((candidate) => candidate.kind === 'habit').map(({ id }) => id),
      tasks: items.filter((candidate) => candidate.kind === 'task').map(({ id }) => id),
    },
  };
}

describe('item actions', () => {
  it('should add a habit or task with its goal starting today', () => {
    const data = emptyData(now);
    const added = reduce(
      data,
      {
        type: 'addItem',
        item: {
          name: ' Read ',
          groupId: null,
          kind: 'habit',
          completion: 'time',
          target: 30,
          timerStyle: 'sessions',
          days: [0, 2, 4],
        },
      },
      now
    );
    const created = added.items[0];

    expect(created).toMatchObject({
      name: 'Read',
      kind: 'habit',
      completion: 'time',
      goals: [{ from: today, target: 30 }],
      timerStyle: 'sessions',
      days: [0, 2, 4],
      createdAt: now,
      updatedAt: now,
    });
    expect(created.id).toBeTruthy();
    expect(added.order.habits).toEqual([created.id]);
  });

  it('should keep past goals and move an item between sections when its kind changes', () => {
    const existing = habit({ days: [2], goals: [{ from: '2024-01-01', target: 30 }] });
    const data = dataWith(existing, habit({ id: 'stretch', name: 'Stretch' }));
    data.sessions.push({
      id: 'yesterday-session',
      itemId: existing.id,
      day: yesterday,
      startedAt: now - 2 * 60 * minute,
      durationMs: 30 * minute,
    });
    const updated = reduce(
      data,
      {
        type: 'updateItem',
        itemId: existing.id,
        item: {
          name: 'Read',
          groupId: null,
          kind: 'task',
          completion: 'time',
          target: 60,
          timerStyle: 'free',
        },
      },
      now
    );

    expect(goalOn(updated.items[0], yesterday)).toBe(30);
    expect(goalOn(updated.items[0], today)).toBe(60);
    expect(isDoneOn(updated, updated.items[0], yesterday)).toBe(true);
    expect(updated.items[0].goals).toEqual([
      { from: '2024-01-01', target: 30 },
      { from: today, target: 60 },
    ]);
    expect(updated.order.habits).toEqual(['stretch']);
    expect(updated.order.tasks).toEqual(['read']);
  });

  it('should restart a changed timer style while preserving its running state and tracked time', () => {
    const existing = task();
    const data = dataWith(existing);
    data.sessions.push({
      id: 'existing-session',
      itemId: existing.id,
      day: today,
      startedAt: now - 5 * minute,
      durationMs: 5 * minute,
    });
    data.clocks[existing.id] = {
      style: 'free',
      phase: 'focus',
      round: 1,
      elapsedMs: 0,
      day: today,
    };
    data.run = { itemId: existing.id, startedAt: now, clock: data.clocks[existing.id] };

    const updated = reduce(
      data,
      {
        type: 'updateItem',
        itemId: existing.id,
        item: {
          name: existing.name,
          groupId: existing.groupId,
          kind: 'task',
          completion: 'time',
          target: 30,
          timerStyle: 'sessions',
        },
      },
      now + minute
    );

    expect(updated.run?.itemId).toBe(existing.id);
    expect(updated.run?.clock).toMatchObject({ style: 'sessions', phase: 'focus', round: 1 });
    expect(updated.clocks[existing.id].elapsedMs).toBe(0);
    expect(updated.sessions.reduce((total, session) => total + session.durationMs, 0)).toBe(
      6 * minute
    );
  });

  it('should restart or remove the clock when completion changes', () => {
    const existing = task();
    const data = dataWith(existing);
    data.sessions.push({
      id: 'existing-session',
      itemId: existing.id,
      day: today,
      startedAt: now - 4 * minute,
      durationMs: 4 * minute,
    });
    data.clocks[existing.id] = {
      style: 'free',
      phase: 'focus',
      round: 1,
      elapsedMs: 0,
      day: today,
    };
    data.run = { itemId: existing.id, startedAt: now, clock: data.clocks[existing.id] };

    const updated = reduce(
      data,
      {
        type: 'updateItem',
        itemId: existing.id,
        item: { name: 'Read', groupId: null, kind: 'task', completion: 'count', target: 3 },
      },
      now + minute
    );

    expect(updated.run).toBeNull();
    expect(updated.clocks[existing.id]).toBeUndefined();
    expect(updated.sessions.reduce((total, session) => total + session.durationMs, 0)).toBe(
      5 * minute
    );
  });

  it.each([
    { completion: 'count', target: 11 },
    { completion: 'time', target: 1441 },
    { completion: 'time', target: 4 },
    { completion: 'count', target: 0 },
  ] as const)('should reject a $completion goal of $target', ({ completion, target }) => {
    expect(() =>
      reduce(
        emptyData(now),
        {
          type: 'addItem',
          item: { name: 'Read', groupId: null, kind: 'task', completion, target },
        },
        now
      )
    ).toThrow(RangeError);
  });

  it.each([
    { completion: 'count', target: 10 },
    { completion: 'time', target: 1440 },
    { completion: 'time', target: 5 },
  ] as const)('should accept the largest $completion goal of $target', ({ completion, target }) => {
    const added = reduce(
      emptyData(now),
      { type: 'addItem', item: { name: 'Read', groupId: null, kind: 'task', completion, target } },
      now
    );

    expect(added.items[0]?.goals[0]?.target).toBe(target);
  });

  it('should reorder every item in the requested section exactly once', () => {
    const data = dataWith(task(), task({ id: 'write', name: 'Write' }));
    const reordered = reduce(
      data,
      { type: 'reorder', section: 'tasks', ids: ['write', 'read'] },
      now
    );

    expect(reordered.order.tasks).toEqual(['write', 'read']);
    expect(() =>
      reduce(data, { type: 'reorder', section: 'tasks', ids: ['read', 'read'] }, now)
    ).toThrow(RangeError);
  });

  it('should delete an item, its history, and its active run with a tombstone', () => {
    const existing = task();
    const data = dataWith(existing);
    data.sessions.push({
      id: 'session',
      itemId: existing.id,
      day: today,
      startedAt: now,
      durationMs: 5 * minute,
    });
    data.marks.push({
      itemId: existing.id,
      day: today,
      count: 0,
      done: true,
      updatedAt: now,
    });
    data.clocks[existing.id] = {
      style: 'free',
      phase: 'focus',
      round: 1,
      elapsedMs: 0,
      day: today,
    };
    data.run = { itemId: existing.id, startedAt: now, clock: data.clocks[existing.id] };
    data.cardItemId = existing.id;
    data.meta.autoStop = { itemId: existing.id, at: now };

    const deleted = reduce(data, { type: 'deleteItem', itemId: existing.id }, now + minute);

    expect(deleted.items).toEqual([]);
    expect(deleted.order.tasks).toEqual([]);
    expect(deleted.sessions).toEqual([]);
    expect(deleted.marks).toEqual([]);
    expect(deleted.run).toBeNull();
    expect(deleted.cardItemId).toBeNull();
    expect(deleted.clocks[existing.id]).toBeUndefined();
    expect(deleted.meta.autoStop).toBeNull();
    expect(deleted.tombstones[existing.id]).toBe(now + minute);
  });

  it('should toggle check items and increment count items on tap', () => {
    const check = task({ id: 'check', completion: 'check', goals: [] });
    const count = task({
      id: 'count',
      completion: 'count',
      goals: [{ from: '2024-01-01', target: 2 }],
    });
    const data = dataWith(check, count);
    const checked = reduce(data, { type: 'tapItem', itemId: check.id }, now);
    const unchecked = reduce(checked, { type: 'tapItem', itemId: check.id }, now + 1);
    const counted = reduce(data, { type: 'tapItem', itemId: count.id }, now);
    const countedAgain = reduce(counted, { type: 'tapItem', itemId: count.id }, now + 1);

    expect(isDoneOn(checked, check, today)).toBe(true);
    expect(isDoneOn(unchecked, check, today)).toBe(false);
    expect(amountOn(countedAgain, count, today)).toBe(2);
    expect(isDoneOn(countedAgain, count, today)).toBe(true);
  });

  it('should start and pause time items on tap, and reopen an explicitly completed item', () => {
    const existing = task();
    const data = dataWith(existing);
    const started = reduce(data, { type: 'tapItem', itemId: existing.id }, now);
    const paused = reduce(started, { type: 'tapItem', itemId: existing.id }, now + 5 * minute);
    const done = reduce(paused, { type: 'markDone', itemId: existing.id }, now + 5 * minute);
    const reopened = reduce(done, { type: 'tapItem', itemId: existing.id }, now + 6 * minute);

    expect(started.run?.itemId).toBe(existing.id);
    expect(paused.run).toBeNull();
    expect(amountOn(paused, existing, today)).toBe(5);
    expect(isDoneOn(done, existing, today)).toBe(true);
    expect(reopened.marks.find((mark) => mark.itemId === existing.id)?.done).toBe(false);
    expect(reopened.run?.itemId).toBe(existing.id);
  });

  it('should mark a running time item done after logging only elapsed time', () => {
    const existing = task();
    const started = reduce(dataWith(existing), { type: 'tapItem', itemId: existing.id }, now);
    const done = reduce(started, { type: 'markDone', itemId: existing.id }, now + 7 * minute);

    expect(done.run).toBeNull();
    expect(done.sessions.reduce((total, session) => total + session.durationMs, 0)).toBe(
      7 * minute
    );
    expect(amountOn(done, existing, today)).toBe(7);
    expect(isDoneOn(done, existing, today)).toBe(true);
  });

  it('should include live focus time only until the current interval ends', () => {
    const existing = task({
      timerStyle: 'sessions',
      goals: [{ from: '2024-01-01', target: 25 }],
    });
    const data = dataWith(existing);
    data.run = {
      itemId: existing.id,
      startedAt: now - 30 * minute,
      clock: { style: 'sessions', phase: 'focus', round: 1, elapsedMs: 0, day: today },
    };

    expect(amountOn(data, existing, today, now)).toBe(25);
    expect(isDoneOn(data, existing, today, now)).toBe(true);

    const onBreak = {
      ...data,
      run: { ...data.run, clock: { ...data.run.clock, phase: 'break' as const } },
    };
    expect(amountOn(onBreak, existing, today, now)).toBe(0);
  });

  it('should split live focus time across the configured day boundary', () => {
    const existing = task();
    const data = dataWith(existing);
    const startedAt = new Date(2024, 0, 2, 23, 55).getTime();
    const stoppedAt = new Date(2024, 0, 3, 0, 5).getTime();
    data.run = {
      itemId: existing.id,
      startedAt,
      clock: { style: 'free', phase: 'focus', round: 1, elapsedMs: 0, day: yesterday },
    };

    expect(amountOn(data, existing, yesterday, stoppedAt)).toBe(5);
    expect(amountOn(data, existing, today, stoppedAt)).toBe(5);
  });

  it('should replace today count and mark it unfinished until the goal is met again', () => {
    const existing = task({
      id: 'water',
      name: 'Water',
      completion: 'count',
      goals: [{ from: '2024-01-01', target: 8 }],
    });
    const data = dataWith(existing);
    data.marks.push({ itemId: existing.id, day: today, count: 6, done: true, updatedAt: now });

    const updated = reduce(data, { type: 'setTodayCount', itemId: existing.id, count: 3 }, now + 1);

    expect(amountOn(updated, existing, today)).toBe(3);
    expect(amountOn(updated, existing, yesterday)).toBe(0);
    expect(isDoneOn(updated, existing, today)).toBe(false);
  });

  it('should schedule habits by weekday and ignore taps on off days', () => {
    const scheduledHabit = habit({ days: [2], completion: 'check', goals: [] });

    expect(scheduledOn(scheduledHabit, '2024-01-10')).toBe(true);
    expect(scheduledOn(scheduledHabit, '2024-01-11')).toBe(false);
    const offDayHabit = habit({ days: [0, 1], completion: 'check', goals: [] });
    const data = dataWith(offDayHabit);
    expect(scheduledOn(offDayHabit, today)).toBe(false);
    expect(reduce(data, { type: 'tapItem', itemId: offDayHabit.id }, now)).toBe(data);
  });

  it('should return display names and summarize tracked history', () => {
    const unnamed = quick();
    const existing = task();
    const data = dataWith(unnamed, existing);
    data.sessions.push(
      { id: 's1', itemId: existing.id, day: today, startedAt: now, durationMs: 4 * minute },
      {
        id: 's2',
        itemId: existing.id,
        day: yesterday,
        startedAt: now - minute,
        durationMs: 3 * minute,
      }
    );
    data.marks.push({ itemId: existing.id, day: today, count: 0, done: true, updatedAt: now });

    expect(displayName(unnamed)).toBe('Session 3');
    expect(displayName(existing)).toBe('Read');
    expect(historyOf(data, existing)).toEqual({ trackedMs: 7 * minute, days: 2 });
  });
});
