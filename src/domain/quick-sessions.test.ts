import { describe, expect, it } from 'vitest';
import { displayName } from './items';
import { reduce } from './reduce';
import { emptyData } from './schema';
import type { AppData, HabitItem, QuickItem } from './types';

const minute = 60 * 1000;
const now = new Date(2024, 0, 3, 9).getTime();
const today = '2024-01-03';

function dataWith(...items: AppData['items']): AppData {
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

function habit(overrides: Partial<HabitItem> = {}): HabitItem {
  return {
    id: 'habit',
    name: 'Stretch',
    kind: 'habit',
    completion: 'time',
    goals: [{ from: today, target: 30 }],
    timerStyle: 'free',
    days: [0, 1, 2, 3, 4, 5, 6],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createQuick(
  data = emptyData(now),
  start = false,
  at = now,
  name?: string
): [AppData, QuickItem] {
  const next = reduce(
    data,
    { type: 'newQuickSession', start, ...(name === undefined ? {} : { name }) },
    at
  );
  const quickItems = next.items.filter((item) => item.kind === 'quick');
  const quick = quickItems[quickItems.length - 1];
  if (!quick) {
    throw new Error('Expected a quick session');
  }
  return [next, quick];
}

describe('quick session actions', () => {
  it('should number new sessions in sequence and keep numbering after a save', () => {
    let data = emptyData(now);
    expect(data.meta.lastQuickNumber).toBeNull();

    [data] = createQuick(data, false, now, 'First');
    const first = data.items.find((item) => item.kind === 'quick');
    expect(first?.number).toBe(1);
    if (!first) {
      throw new Error('Expected the first quick session');
    }
    data = reduce(data, { type: 'saveQuickAsTask', itemId: first.id }, now);

    [data] = createQuick(data, false, now + minute);
    const second = data.items.find((item) => item.kind === 'quick');
    expect(second?.number).toBe(2);
    [data] = createQuick(data, false, now + 2 * minute);
    const sameDayItems = data.items.filter((item) => item.kind === 'quick');
    expect(sameDayItems[sameDayItems.length - 1]?.number).toBe(3);

    [data] = createQuick(data, false, now + 24 * 60 * minute);
    const newDayItems = data.items.filter((item) => item.kind === 'quick');
    expect(newDayItems[newDayItems.length - 1]?.number).toBe(1);
  });

  it('should pin and start a quick session while pausing the running item', () => {
    const runningHabit = reduce(dataWith(habit()), { type: 'start', itemId: 'habit' }, now);
    const next = reduce(
      runningHabit,
      { type: 'newQuickSession', start: true, name: '  Draft  ' },
      now + 4 * minute
    );
    const quick = next.items.find((item) => item.kind === 'quick');

    expect(next.sessions).toHaveLength(1);
    expect(next.sessions[0]).toMatchObject({ itemId: 'habit', durationMs: 4 * minute });
    expect(quick).toMatchObject({ name: 'Draft', number: 1, timerStyle: 'free' });
    expect(next.cardItemId).toBe(quick?.id);
    expect(next.run?.itemId).toBe(quick?.id);
  });

  it('should keep an unstarted quick session paused on the card', () => {
    const [data, quick] = createQuick();

    expect(data.run).toBeNull();
    expect(data.cardItemId).toBe(quick.id);
    expect(data.clocks[quick.id]).toBeUndefined();
  });

  it('should trim a quick session name and restore its default name when cleared', () => {
    const [data, quick] = createQuick();
    const renamed = reduce(
      data,
      { type: 'renameQuick', itemId: quick.id, name: '  Notes  ' },
      now + minute
    );
    expect(renamed.items.find((item) => item.id === quick.id)?.name).toBe('Notes');

    const cleared = reduce(
      renamed,
      { type: 'renameQuick', itemId: quick.id, name: '   ' },
      now + 2 * minute
    );
    const item = cleared.items.find((candidate) => candidate.id === quick.id);
    expect(item?.name).toBe('');
    expect(item && displayName(item)).toBe('Session 1');
  });

  it('should log each pause of a quick session separately', () => {
    let data = reduce(emptyData(now), { type: 'newQuickSession', start: true }, now);
    const quickId = data.run?.itemId;
    for (let pause = 0; pause < 3; pause += 1) {
      const pausedAt = now + (pause * 10 + 5) * minute;
      data = reduce(data, { type: 'pause' }, pausedAt);
      if (pause < 2) {
        data = reduce(data, { type: 'start', itemId: quickId! }, now + (pause + 1) * 10 * minute);
      }
    }

    expect(data.sessions.filter((session) => session.itemId === quickId)).toHaveLength(3);
    expect(data.sessions.map((session) => session.durationMs)).toEqual([
      5 * minute,
      5 * minute,
      5 * minute,
    ]);
  });

  it('should restart a running quick clock in the new style without losing tracked time', () => {
    let data = reduce(emptyData(now), { type: 'newQuickSession', start: true }, now);
    const quickId = data.run!.itemId;
    data = reduce(
      data,
      { type: 'setQuickStyle', itemId: quickId, style: 'sessions' },
      now + 8 * minute
    );

    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0]).toMatchObject({ itemId: quickId, durationMs: 8 * minute });
    expect(data.run).toMatchObject({
      itemId: quickId,
      startedAt: now + 8 * minute,
      clock: { style: 'sessions', phase: 'focus', round: 1, elapsedMs: 0 },
    });
    expect(data.cardItemId).toBe(quickId);
    expect(data.meta.quickStyle).toBe('sessions');
  });

  it('should restart a paused quick clock without resuming it', () => {
    let data = reduce(emptyData(now), { type: 'newQuickSession', start: true }, now);
    const quickId = data.run!.itemId;
    data = reduce(data, { type: 'pause' }, now + 7 * minute);
    const sessions = data.sessions;

    data = reduce(
      data,
      { type: 'setQuickStyle', itemId: quickId, style: 'sessions' },
      now + 8 * minute
    );

    expect(data.run).toBeNull();
    expect(data.sessions).toEqual(sessions);
    expect(data.clocks[quickId]).toMatchObject({
      style: 'sessions',
      phase: 'focus',
      round: 1,
      elapsedMs: 0,
    });
  });

  it('should save a pinned quick session as a task with the same id, time, and clock', () => {
    let data = reduce(
      emptyData(now),
      { type: 'newQuickSession', start: true, name: 'Writing' },
      now
    );
    const quickId = data.run!.itemId;
    data = reduce(data, { type: 'pause' }, now + 12 * minute);
    const sessions = data.sessions;
    const clock = data.clocks[quickId];
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ itemId: quickId, durationMs: 12 * minute });

    data = reduce(data, { type: 'saveQuickAsTask', itemId: quickId }, now + 13 * minute);
    const saved = data.items.find((item) => item.id === quickId);

    expect(saved).toMatchObject({
      id: quickId,
      kind: 'task',
      name: 'Writing',
      completion: 'time',
      goals: [{ from: today, target: 30 }],
      timerStyle: 'free',
      updatedAt: now + 13 * minute,
    });
    expect(data.items.some((item) => item.kind === 'quick')).toBe(false);
    expect(data.sessions).toEqual(sessions);
    expect(data.clocks[quickId]).toEqual(clock);
    expect(data.cardItemId).toBe(quickId);
    expect(data.order.tasks).toContain(quickId);
  });

  it('should save an unnamed quick session as a task under its default name', () => {
    const [data, quick] = createQuick();

    const saved = reduce(data, { type: 'saveQuickAsTask', itemId: quick.id }, now);

    expect(saved.items.find((item) => item.id === quick.id)).toMatchObject({
      kind: 'task',
      name: `Session ${quick.number}`,
    });
  });

  it('should end a pinned quick session when another time item starts', () => {
    let data = dataWith(habit());
    data = reduce(data, { type: 'newQuickSession', start: true }, now);
    const quickId = data.run!.itemId;
    data = reduce(data, { type: 'tapItem', itemId: 'habit' }, now + 6 * minute);

    expect(data.run?.itemId).toBe('habit');
    expect(data.cardItemId).toBeNull();
    expect(data.items.some((item) => item.id === quickId && item.kind === 'quick')).toBe(true);
    expect(data.clocks[quickId]).toBeUndefined();
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0]).toMatchObject({ itemId: quickId, durationMs: 6 * minute });
  });
});
