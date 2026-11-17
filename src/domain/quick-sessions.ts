import { dayKeyOf } from './days';
import { displayName } from './items';
import { pauseRun, restartClock, startItem } from './clock';
import type { AppData, QuickItem, TaskItem, TimerStyle } from './types';

export function nextQuickNumber(data: AppData, day: string): number {
  const last = data.meta.lastQuickNumber;
  return last?.day === day ? last.number + 1 : 1;
}

function findQuick(data: AppData, itemId: string): QuickItem {
  const item = data.items.find((candidate) => candidate.id === itemId);
  if (!item || item.kind !== 'quick') {
    throw new RangeError(`Unknown quick session: ${itemId}`);
  }
  return item;
}

export function newQuickSession(
  data: AppData,
  options: { start: boolean; name?: string },
  now: number
): AppData {
  const day = dayKeyOf(now, data.settings.dayStartHour);
  const number = nextQuickNumber(data, day);
  const paused = pauseRun(data, now);
  const item: QuickItem = {
    id: crypto.randomUUID(),
    kind: 'quick',
    name: options.name?.trim() ?? '',
    completion: 'time',
    goals: [],
    timerStyle: data.meta.quickStyle,
    number,
    day,
    createdAt: now,
    updatedAt: now,
  };
  const created: AppData = {
    ...paused,
    items: [...paused.items, item],
    cardItemId: item.id,
    meta: { ...paused.meta, lastQuickNumber: { day, number } },
  };
  return options.start ? startItem(created, item.id, now) : created;
}

export function renameQuick(data: AppData, itemId: string, name: string, now: number): AppData {
  const quick = findQuick(data, itemId);
  const updated = { ...quick, name: name.trim(), updatedAt: now };
  return {
    ...data,
    items: data.items.map((item) => (item.id === itemId ? updated : item)),
  };
}

export function setQuickStyle(
  data: AppData,
  itemId: string,
  style: TimerStyle,
  now: number
): AppData {
  const quick = findQuick(data, itemId);
  const updated: QuickItem = { ...quick, timerStyle: style, updatedAt: now };
  const changed: AppData = {
    ...data,
    items: data.items.map((item) => (item.id === itemId ? updated : item)),
    meta: { ...data.meta, quickStyle: style },
  };
  return style === quick.timerStyle ? changed : restartClock(changed, itemId, now);
}

export function saveQuickAsTask(data: AppData, itemId: string, now: number): AppData {
  const quick = findQuick(data, itemId);
  const pinned = data.cardItemId === itemId;
  const paused = !pinned && data.run?.itemId === itemId ? pauseRun(data, now) : data;
  const task: TaskItem = {
    id: quick.id,
    kind: 'task',
    name: displayName(quick),
    completion: 'time',
    goals: [{ from: dayKeyOf(now, data.settings.dayStartHour), target: 30 }],
    timerStyle: quick.timerStyle,
    createdAt: quick.createdAt,
    updatedAt: now,
  };
  const clocks = { ...paused.clocks };
  if (!pinned) {
    delete clocks[itemId];
  }
  return {
    ...paused,
    items: paused.items.map((item) => (item.id === itemId ? task : item)),
    order: { ...paused.order, tasks: [...paused.order.tasks, itemId] },
    clocks,
  };
}
