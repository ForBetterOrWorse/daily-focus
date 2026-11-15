import { addDays, dayKeyOf, weekRange } from './days';
import { amountOn, isDoneOn } from './items';
import type { AppData, DayKey, Item } from './types';

const TRACKED_MINUTES = 10;
const GRID_WEEKS = 53;

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface GridCell {
  day: DayKey;
  count: number;
  level: ActivityLevel;
  future: boolean;
}

export function hasTracked(data: AppData): boolean {
  return data.sessions.length > 0 || data.marks.length > 0;
}

function countsOn(data: AppData, item: Item, day: DayKey): boolean {
  if (item.kind === 'habit') {
    return isDoneOn(data, item, day);
  }
  if (item.completion === 'time' && amountOn(data, item, day) >= TRACKED_MINUTES) {
    return true;
  }
  return item.kind === 'task' && isDoneOn(data, item, day);
}

export function activitiesOn(data: AppData, day: DayKey): Item[] {
  return data.items.filter((item) => countsOn(data, item, day));
}

export function levelOf(count: number): ActivityLevel {
  if (count >= 6) {
    return 4;
  }
  if (count >= 4) {
    return 3;
  }
  if (count >= 2) {
    return 2;
  }
  return count >= 1 ? 1 : 0;
}

export function isSkipped(data: AppData, day: DayKey): boolean {
  return data.skips.includes(day) && activitiesOn(data, day).length === 0;
}

function firstTrackedDay(data: AppData): DayKey | null {
  const days = [...data.sessions.map(({ day }) => day), ...data.marks.map(({ day }) => day)];
  return days.length === 0 ? null : days.reduce((first, day) => (day < first ? day : first));
}

export function streak(data: AppData, today: DayKey): number {
  const first = firstTrackedDay(data);
  if (first === null) {
    return 0;
  }

  let length = 0;
  for (let day = today; day >= first; day = addDays(day, -1)) {
    if (activitiesOn(data, day).length > 0) {
      length += 1;
    } else if (!isSkipped(data, day) && day !== today) {
      break;
    }
  }
  return length;
}

export function skipsLeft(data: AppData, month: string): number {
  const used = data.skips.filter((day) => day.startsWith(month) && isSkipped(data, day)).length;
  return Math.max(0, data.settings.skipsPerMonth - used);
}

/**
 * A skip is offered only for yesterday, when it is empty and the day before it
 * has activity, so the streak is about to break there. Yesterday must fall in
 * the same calendar month as today, because skips are counted per month.
 */
export function isSkipOffered(data: AppData, day: DayKey, today: DayKey): boolean {
  return (
    day === addDays(today, -1) &&
    day.startsWith(today.slice(0, 7)) &&
    activitiesOn(data, day).length === 0 &&
    !isSkipped(data, day) &&
    activitiesOn(data, addDays(day, -1)).length > 0
  );
}

export function skipDay(data: AppData, day: DayKey, now: number): AppData {
  const today = dayKeyOf(now, data.settings.dayStartHour);
  if (!isSkipOffered(data, day, today) || skipsLeft(data, today.slice(0, 7)) === 0) {
    return data;
  }
  return { ...data, skips: [...data.skips, day] };
}

export function dropSkipsWithActivity(data: AppData): AppData {
  const skips = data.skips.filter((day) => activitiesOn(data, day).length === 0);
  return skips.length === data.skips.length ? data : { ...data, skips };
}

export function buildGrid(
  data: AppData,
  today: DayKey,
  weekStart: AppData['settings']['weekStart']
): GridCell[][] {
  const firstDay = addDays(weekRange(today, weekStart).start, -(GRID_WEEKS - 1) * 7);
  return Array.from({ length: GRID_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = addDays(firstDay, week * 7 + weekday);
      const future = day > today;
      const count = future ? 0 : activitiesOn(data, day).length;
      return { day, count, level: levelOf(count), future };
    })
  );
}
