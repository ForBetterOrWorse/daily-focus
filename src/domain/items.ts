import { dayKeyOf, splitAtDayBoundaries, weekdayOf } from './days';
import { nextIntervalEnd, pauseRun, restartClock, startItem } from './clock';
import type { AppData, DayKey, HabitItem, Item, TaskItem, TimerStyle } from './types';

export type ItemSection = 'habits' | 'tasks';

interface ItemInputBase {
  name: string;
  kind: 'habit' | 'task';
  days?: number[];
}

export type ItemInput =
  | (ItemInputBase & { completion: 'check'; target?: never; timerStyle?: never })
  | (ItemInputBase & { completion: 'count'; target: number; timerStyle?: never })
  | (ItemInputBase & { completion: 'time'; target: number; timerStyle?: TimerStyle });

type ItemFields =
  | Omit<HabitItem, 'id' | 'createdAt' | 'updatedAt' | 'goals'>
  | Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt' | 'goals'>;

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export const MAX_COUNT_GOAL = 10;
// Goals saved under the earlier 999 cap must still load, so stored data validates against this bound.
export const MAX_STORED_COUNT_GOAL = 999;
export const MAX_TIME_GOAL_MINUTES = 1440;

export const MIN_TIME_GOAL_MINUTES = 5;

export function minGoal(completion: 'count' | 'time'): number {
  return completion === 'count' ? 1 : MIN_TIME_GOAL_MINUTES;
}

export function maxGoal(completion: 'count' | 'time'): number {
  return completion === 'count' ? MAX_COUNT_GOAL : MAX_TIME_GOAL_MINUTES;
}

function itemFields(input: ItemInput): ItemFields {
  const name = input.name.trim();
  if (!name) {
    throw new RangeError('Item name must not be empty');
  }
  if (
    input.completion !== 'check' &&
    (!Number.isFinite(input.target) ||
      input.target < minGoal(input.completion) ||
      input.target > maxGoal(input.completion) ||
      (input.completion === 'count' && !Number.isInteger(input.target)))
  ) {
    throw new RangeError(
      `Item goal must be a number from ${minGoal(input.completion)} to ${maxGoal(input.completion)}`
    );
  }
  if (input.kind === 'task' && input.days !== undefined) {
    throw new RangeError('Only habits can have scheduled days');
  }
  if (
    input.days !== undefined &&
    (input.days.length === 0 ||
      input.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(input.days).size !== input.days.length)
  ) {
    throw new RangeError('Habit days must be unique weekdays');
  }

  const base = {
    name,
    completion: input.completion,
    ...(input.completion === 'time' && input.timerStyle !== undefined
      ? { timerStyle: input.timerStyle }
      : {}),
  };
  return input.kind === 'habit'
    ? { ...base, kind: 'habit', days: [...(input.days ?? EVERY_DAY)] }
    : { ...base, kind: 'task' };
}

function itemSection(item: Pick<Item, 'kind'>): ItemSection {
  return item.kind === 'habit' ? 'habits' : 'tasks';
}

function findItem(data: AppData, itemId: string): Item {
  const item = data.items.find((candidate) => candidate.id === itemId);
  if (!item) {
    throw new RangeError(`Unknown item: ${itemId}`);
  }
  return item;
}

function markFor(data: AppData, itemId: string, day: DayKey) {
  return data.marks.find((mark) => mark.itemId === itemId && mark.day === day);
}

function updateMark(
  data: AppData,
  itemId: string,
  day: DayKey,
  now: number,
  changes: { count?: number; done?: boolean }
): AppData {
  const current = markFor(data, itemId, day);
  const mark = {
    itemId,
    day,
    count: current?.count ?? 0,
    done: current?.done ?? false,
    ...changes,
    updatedAt: now,
  };
  return {
    ...data,
    marks: [
      ...data.marks.filter((candidate) => candidate.itemId !== itemId || candidate.day !== day),
      mark,
    ],
  };
}

export function addItem(data: AppData, input: ItemInput, now: number): AppData {
  const fields = itemFields(input);
  const today = dayKeyOf(now, data.settings.dayStartHour);
  const goals = input.completion === 'check' ? [] : [{ from: today, target: input.target }];
  const item: Item = {
    ...fields,
    id: crypto.randomUUID(),
    goals,
    createdAt: now,
    updatedAt: now,
  };
  const section = itemSection(item);

  return {
    ...data,
    items: [...data.items, item],
    order: {
      ...data.order,
      [section]: [...data.order[section], item.id],
    },
  };
}

export function updateItem(data: AppData, itemId: string, input: ItemInput, now: number): AppData {
  const existing = findItem(data, itemId);
  if (existing.kind === 'quick') {
    throw new RangeError('Quick sessions cannot be updated as items');
  }

  const fields = itemFields(input);
  const today = dayKeyOf(now, data.settings.dayStartHour);
  const goals =
    input.completion === 'check'
      ? []
      : existing.completion === 'check'
        ? [{ from: today, target: input.target }]
        : goalOn(existing, today) === input.target
          ? existing.goals
          : [...existing.goals, { from: today, target: input.target }];
  const updated: Item = {
    ...fields,
    id: existing.id,
    goals,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
  let next: AppData = {
    ...data,
    items: data.items.map((item) => (item.id === itemId ? updated : item)),
  };

  if (existing.kind !== updated.kind) {
    const previousSection = itemSection(existing);
    const nextSection = itemSection(updated);
    next = {
      ...next,
      order: {
        ...next.order,
        [previousSection]: next.order[previousSection].filter((id) => id !== itemId),
        [nextSection]: [...next.order[nextSection], itemId],
      },
    };
  }

  const timerChanged =
    existing.completion !== updated.completion ||
    (updated.completion === 'time' &&
      (existing.timerStyle ?? 'sessions') !== (updated.timerStyle ?? 'sessions'));
  return timerChanged ? restartClock(next, itemId, now) : next;
}

export function reorder(data: AppData, section: ItemSection, ids: string[]): AppData {
  const currentIds = data.items.filter((item) => itemSection(item) === section).map(({ id }) => id);
  if (
    ids.length !== currentIds.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !currentIds.includes(id))
  ) {
    throw new RangeError(`Reorder must include every ${section} item exactly once`);
  }

  return {
    ...data,
    order: {
      ...data.order,
      [section]: [...ids],
    },
  };
}

export function deleteItem(data: AppData, itemId: string, now: number): AppData {
  const item = findItem(data, itemId);
  if (item.kind === 'quick') {
    return data;
  }
  const paused = data.run?.itemId === itemId ? pauseRun(data, now) : data;
  const clocks = { ...paused.clocks };
  delete clocks[itemId];

  return {
    ...paused,
    items: paused.items.filter((candidate) => candidate.id !== itemId),
    order: {
      habits: paused.order.habits.filter((id) => id !== itemId),
      tasks: paused.order.tasks.filter((id) => id !== itemId),
    },
    sessions: paused.sessions.filter((session) => session.itemId !== itemId),
    marks: paused.marks.filter((mark) => mark.itemId !== itemId),
    clocks,
    run: paused.run?.itemId === itemId ? null : paused.run,
    cardItemId: paused.cardItemId === itemId ? null : paused.cardItemId,
    tombstones: { ...paused.tombstones, [itemId]: now },
    meta:
      paused.meta.autoStop?.itemId === itemId ? { ...paused.meta, autoStop: null } : paused.meta,
  };
}

export function tapItem(data: AppData, itemId: string, now: number): AppData {
  const item = findItem(data, itemId);
  if (item.kind === 'quick') {
    return data;
  }
  const today = dayKeyOf(now, data.settings.dayStartHour);
  if (!scheduledOn(item, today)) {
    return data;
  }

  if (item.completion === 'check') {
    const mark = markFor(data, itemId, today);
    return updateMark(data, itemId, today, now, { done: !(mark?.done ?? false) });
  }
  if (item.completion === 'count') {
    const mark = markFor(data, itemId, today);
    return updateMark(data, itemId, today, now, { count: (mark?.count ?? 0) + 1 });
  }

  const mark = markFor(data, itemId, today);
  const reopened =
    mark?.done === true ? updateMark(data, itemId, today, now, { done: false }) : data;
  return reopened.run?.itemId === itemId
    ? pauseRun(reopened, now)
    : startItem(reopened, itemId, now);
}

export function markDone(data: AppData, itemId: string, now: number): AppData {
  const item = findItem(data, itemId);
  if (item.kind === 'quick') {
    return data;
  }
  if (item.completion !== 'time') {
    throw new RangeError('Only time items can be marked done');
  }
  const today = dayKeyOf(now, data.settings.dayStartHour);
  if (!scheduledOn(item, today)) {
    return data;
  }

  const paused = data.run?.itemId === itemId ? pauseRun(data, now) : data;
  return updateMark(paused, itemId, today, now, { done: true });
}

export function setTodayCount(data: AppData, itemId: string, count: number, now: number): AppData {
  const item = findItem(data, itemId);
  if (item.completion !== 'count') {
    throw new RangeError('Only count items have a daily count');
  }
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('Count must be a non-negative integer');
  }

  const today = dayKeyOf(now, data.settings.dayStartHour);
  if (!scheduledOn(item, today)) {
    return data;
  }

  return updateMark(data, itemId, today, now, { count, done: false });
}

export function goalOn(item: Item, day: DayKey): number | null {
  let goal: Item['goals'][number] | undefined;
  for (const candidate of item.goals) {
    if (candidate.from <= day && (goal === undefined || candidate.from >= goal.from)) {
      goal = candidate;
    }
  }
  return goal?.target ?? null;
}

export function amountOn(data: AppData, item: Item, day: DayKey, now?: number): number {
  if (item.completion === 'count') {
    return markFor(data, item.id, day)?.count ?? 0;
  }
  if (item.completion === 'time') {
    const loggedDurationMs = data.sessions
      .filter((session) => session.itemId === item.id && session.day === day)
      .reduce((total, session) => total + session.durationMs, 0);
    const { run } = data;
    if (now === undefined || run?.itemId !== item.id || run.clock.phase !== 'focus') {
      return loggedDurationMs / 60_000;
    }

    const end = Math.min(now, nextIntervalEnd(data, now) ?? now);
    if (end <= run.startedAt) {
      return loggedDurationMs / 60_000;
    }

    const activeDurationMs = splitAtDayBoundaries(run.startedAt, end, data.settings.dayStartHour)
      .filter((segment) => segment.day === day)
      .reduce((total, segment) => total + segment.durationMs, 0);
    return (loggedDurationMs + activeDurationMs) / 60_000;
  }
  return 0;
}

export function isDoneOn(data: AppData, item: Item, day: DayKey, now?: number): boolean {
  const mark = markFor(data, item.id, day);
  if (mark?.done) {
    return true;
  }
  if (item.completion === 'check') {
    return false;
  }
  const goal = goalOn(item, day);
  return goal !== null && amountOn(data, item, day, now) >= goal;
}

export function scheduledOn(item: Item, day: DayKey): boolean {
  return item.kind !== 'habit' || item.days.includes(weekdayOf(day));
}

export function displayName(item: Item): string {
  return item.kind === 'quick' && item.name === '' ? `Session ${item.number}` : item.name;
}

export function historyOf(data: AppData, item: Item): { trackedMs: number; days: number } {
  const sessions = data.sessions.filter((session) => session.itemId === item.id);
  const marks = data.marks.filter(
    (mark) => mark.itemId === item.id && (mark.done || mark.count > 0)
  );
  const days = new Set([
    ...sessions.map((session) => session.day),
    ...marks.map((mark) => mark.day),
  ]);
  return {
    trackedMs: sessions.reduce((total, session) => total + session.durationMs, 0),
    days: days.size,
  };
}
