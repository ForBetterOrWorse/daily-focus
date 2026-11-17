import { describe, expect, it } from 'vitest';
import { buildGrid, streak } from './activity';
import { exportJson, importPreview, mergeData, replaceData } from './backup';
import { emptyData, parseData } from './schema';
import type { AppData, HabitItem, QuickItem, Session, TaskItem } from './types';

const minute = 60 * 1000;
const now = new Date(2024, 0, 3, 9).getTime();
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

function quick(overrides: Partial<QuickItem> = {}): QuickItem {
  return {
    id: 'quick-1',
    name: 'Essay',
    kind: 'quick',
    completion: 'time',
    goals: [],
    timerStyle: 'free',
    number: 1,
    day: '2024-01-03',
    createdAt: now,
    updatedAt: now,
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

function dataWith(overrides: Partial<AppData>): AppData {
  return { ...emptyData(now), ...overrides };
}

describe('exportJson', () => {
  it('should name the file with the local date of now', () => {
    expect(exportJson(emptyData(now), now).fileName).toBe('daily-focus-2024-01-03.json');
  });

  it('should round-trip through parseData', () => {
    const data = dataWith({
      items: [task(), quick()],
      order: { habits: [], tasks: ['read'] },
      sessions: [session('read', '2024-01-03', 25)],
    });

    const { text } = exportJson(data, now);

    expect(parseData(JSON.parse(text))).toEqual({
      ...data,
      meta: { ...data.meta, lastExportAt: now },
    });
  });
});

const later = now + 60 * minute;

function habit(overrides: Partial<HabitItem> = {}): HabitItem {
  return {
    ...task({ id: 'run', name: 'Run', completion: 'check', goals: [], timerStyle: undefined }),
    kind: 'habit',
    days: [0, 1, 2, 3, 4, 5, 6],
    ...overrides,
  };
}

function sessionIds(data: AppData): string[] {
  return data.sessions.map(({ id }) => id).sort();
}

describe('importPreview', () => {
  it('should discard legacy groups while preserving their items', () => {
    const legacy = {
      ...emptyData(now),
      groups: [{ id: 'work', name: 'Work', updatedAt: now }],
      items: [{ ...task(), groupId: 'work' }],
    };

    const preview = importPreview(legacy);
    if (!preview.ok) {
      throw new Error('Expected legacy backup data to import');
    }

    expect(preview).toMatchObject({
      ok: true,
      data: { items: [{ id: 'read', name: 'Read' }] },
    });
    expect(preview.data).not.toHaveProperty('groups');
    expect(preview.data.items[0]).not.toHaveProperty('groupId');
  });

  it('should return the parsed data with counts and the export date', () => {
    const data = dataWith({
      items: [task(), quick()],
      sessions: [session('read', '2024-01-03', 25)],
      meta: { ...emptyData(now).meta, lastExportAt: later },
    });

    const preview = importPreview(JSON.parse(JSON.stringify(data)));

    expect(preview).toEqual({ ok: true, data, items: 2, sessions: 1, exportedAt: later });
  });

  it('should report a null export date for a file never exported', () => {
    const preview = importPreview(emptyData(now));

    expect(preview).toMatchObject({ ok: true, exportedAt: null });
  });

  it('should reject an object that is not a backup', () => {
    expect(importPreview({})).toEqual({ ok: false });
  });

  it('should reject an object with the wrong version', () => {
    expect(importPreview({ ...emptyData(now), version: 2 })).toEqual({ ok: false });
  });

  it('should reject a non-object', () => {
    expect(importPreview('backup')).toEqual({ ok: false });
  });
});

describe('replaceData', () => {
  it('should restore the same data, grid, and streak into an empty browser', () => {
    const source = dataWith({
      items: [task(), habit(), quick()],
      order: { habits: ['run'], tasks: ['read'] },
      sessions: [
        session('read', '2024-01-03', 25),
        session('quick-1', '2024-01-02', 15),
        session('read', '2024-01-01', 30),
      ],
      marks: [{ itemId: 'run', day: '2024-01-03', count: 0, done: true, updatedAt: now }],
      settings: { dayStartHour: 3, weekStart: 'sunday', skipsPerMonth: 4, updatedAt: later },
    });
    const incoming = importPreview(JSON.parse(exportJson(source, now).text));
    if (!incoming.ok) {
      throw new Error('expected a valid backup');
    }

    const restored = replaceData(emptyData(later), incoming.data, later);

    expect(restored.items).toEqual(source.items);
    expect(restored.sessions).toEqual(source.sessions);
    expect(restored.order).toEqual(source.order);
    expect(restored.settings).toEqual(source.settings);
    expect(buildGrid(restored, '2024-01-03', 'sunday')).toEqual(
      buildGrid(source, '2024-01-03', 'sunday')
    );
    expect(streak(restored, '2024-01-03')).toBe(streak(source, '2024-01-03'));
  });

  it('should keep the first use date of this browser', () => {
    const local = { ...emptyData(now), meta: { ...emptyData(now).meta, firstUseAt: now } };
    const incoming = emptyData(now - 1000 * minute);

    expect(replaceData(local, incoming, later).meta.firstUseAt).toBe(now);
  });
});

describe('mergeData', () => {
  it('should keep every session from both devices', () => {
    const local = dataWith({
      items: [task()],
      order: { habits: [], tasks: ['read'] },
      sessions: [session('read', '2024-01-03', 10, 's1'), session('read', '2024-01-02', 5, 's2')],
    });
    const incoming = dataWith({
      items: [task(), habit()],
      order: { habits: ['run'], tasks: ['read'] },
      sessions: [session('read', '2024-01-02', 5, 's2'), session('run', '2024-01-03', 7, 's3')],
    });

    expect(sessionIds(mergeData(local, incoming, later))).toEqual(['s1', 's2', 's3']);
  });

  it('should show a quick session present in both exports once', () => {
    const both = dataWith({
      items: [quick()],
      sessions: [session('quick-1', '2024-01-03', 10, 's1')],
    });

    const merged = mergeData(both, both, later);

    expect(merged.items.filter((item) => item.id === 'quick-1')).toHaveLength(1);
    expect(merged.sessions).toHaveLength(1);
  });

  it('should end a quick session saved as a task on one side only as the task', () => {
    const asTask = task({ id: 'quick-1', name: 'Essay', updatedAt: later });
    const withQuick = dataWith({ items: [quick()] });
    const withTask = dataWith({ items: [asTask], order: { habits: [], tasks: ['quick-1'] } });

    const localQuick = mergeData(withQuick, withTask, later);
    const localTask = mergeData(withTask, withQuick, later);

    expect(localQuick.items).toEqual([asTask]);
    expect(localQuick.order.tasks).toEqual(['quick-1']);
    expect(localTask.items).toEqual([asTask]);
    expect(localTask.order.tasks).toEqual(['quick-1']);
  });

  it('should pick the item with the newer updatedAt and keep local on a tie', () => {
    const local = dataWith({
      items: [task({ name: 'Local', updatedAt: later }), habit({ name: 'Tie A' })],
      order: { habits: ['run'], tasks: ['read'] },
    });
    const incoming = dataWith({
      items: [task({ name: 'Incoming' }), habit({ name: 'Tie B' })],
      order: { habits: ['run'], tasks: ['read'] },
    });

    const names = mergeData(local, incoming, later).items.map((item) => item.name);

    expect(names).toEqual(['Local', 'Tie A']);
  });

  it('should not bring back an item deleted on one device', () => {
    const local = dataWith({
      tombstones: { read: later },
    });
    const incoming = dataWith({
      items: [task()],
      order: { habits: [], tasks: ['read'] },
      sessions: [session('read', '2024-01-03', 10, 's1')],
      marks: [{ itemId: 'read', day: '2024-01-03', count: 1, done: false, updatedAt: now }],
    });

    const merged = mergeData(local, incoming, later);

    expect(merged.items).toEqual([]);
    expect(merged.order.tasks).toEqual([]);
    expect(merged.sessions).toEqual([]);
    expect(merged.marks).toEqual([]);
    expect(merged.tombstones).toEqual({ read: later });
  });

  it('should keep an item edited after the other device deleted it', () => {
    const local = dataWith({ items: [task({ updatedAt: later + 1 })] });
    const incoming = dataWith({ tombstones: { read: later } });

    expect(mergeData(local, incoming, later).items).toHaveLength(1);
  });

  it('should keep the later tombstone time from both sides', () => {
    const local = dataWith({ tombstones: { a: 5, b: 9 } });
    const incoming = dataWith({ tombstones: { a: 7, b: 3, c: 1 } });

    expect(mergeData(local, incoming, later).tombstones).toEqual({ a: 7, b: 9, c: 1 });
  });

  it('should use the newer settings', () => {
    const newer = {
      dayStartHour: 4,
      weekStart: 'sunday' as const,
      skipsPerMonth: 3,
      updatedAt: later,
    };
    const local = dataWith({ settings: newer });
    const incoming = emptyData(now);

    expect(mergeData(local, incoming, later).settings).toEqual(newer);
    expect(mergeData(incoming, local, later).settings).toEqual(newer);
  });

  it('should use the newer mark and keep local on a tie', () => {
    const mark = { itemId: 'read', day: '2024-01-03', count: 1, done: false };
    const local = dataWith({
      items: [task()],
      marks: [{ ...mark, updatedAt: now }],
    });
    const incoming = dataWith({
      items: [task()],
      marks: [{ ...mark, count: 5, updatedAt: later }],
    });

    expect(mergeData(local, incoming, later).marks[0].count).toBe(5);
    expect(mergeData(incoming, local, later).marks[0].count).toBe(5);
  });

  it('should keep local order and append new incoming ids', () => {
    const items = [task({ id: 'a' }), task({ id: 'b' }), task({ id: 'c' }), habit({ id: 'h1' })];
    const local = dataWith({
      items: items.slice(0, 2),
      order: { habits: [], tasks: ['b', 'a'] },
    });
    const incoming = dataWith({
      items,
      order: { habits: ['h1'], tasks: ['a', 'c', 'b'] },
    });

    const merged = mergeData(local, incoming, later);

    expect(merged.order).toEqual({ habits: ['h1'], tasks: ['b', 'a', 'c'] });
  });

  it('should drop an order id whose item is of another kind', () => {
    const local = dataWith({
      items: [task({ id: 'a' })],
      order: { habits: ['a'], tasks: ['a'] },
    });

    expect(mergeData(local, emptyData(now), later).order).toEqual({ habits: [], tasks: ['a'] });
  });

  it('should take the later day for lastQuickNumber, then the higher number', () => {
    const withLast = (day: string, number: number) =>
      dataWith({ meta: { ...emptyData(now).meta, lastQuickNumber: { day, number } } });

    const laterDay = mergeData(withLast('2024-01-02', 9), withLast('2024-01-03', 1), later);
    const sameDay = mergeData(withLast('2024-01-03', 2), withLast('2024-01-03', 5), later);
    const fromNull = mergeData(emptyData(now), withLast('2024-01-03', 5), later);
    const keepsNonNull = mergeData(withLast('2024-01-03', 5), emptyData(now), later);

    expect(laterDay.meta.lastQuickNumber).toEqual({ day: '2024-01-03', number: 1 });
    expect(sameDay.meta.lastQuickNumber).toEqual({ day: '2024-01-03', number: 5 });
    expect(fromNull.meta.lastQuickNumber).toEqual({ day: '2024-01-03', number: 5 });
    expect(keepsNonNull.meta.lastQuickNumber).toEqual({ day: '2024-01-03', number: 5 });
  });

  it('should take the earlier first use date and keep other local meta', () => {
    const local = dataWith({
      meta: { ...emptyData(now).meta, firstUseAt: now, bannerDismissedAt: 42 },
    });
    const incoming = emptyData(now - 1000);

    const { meta } = mergeData(local, incoming, later);

    expect(meta.firstUseAt).toBe(now - 1000);
    expect(meta.bannerDismissedAt).toBe(42);
  });

  it('should union skips and keep version 1', () => {
    const local = dataWith({ skips: ['2024-01-01'] });
    const incoming = dataWith({ skips: ['2024-01-01', '2024-01-02'] });

    const merged = mergeData(local, incoming, later);

    expect(merged.skips).toEqual(['2024-01-01', '2024-01-02']);
    expect(merged.version).toBe(1);
  });
});
