import type { DayKey } from './types';

type WeekStart = 'monday' | 'sunday';

function dateParts(key: DayKey): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) {
    throw new RangeError(`Invalid day key: ${key}`);
  }

  const [, yearString, monthString, dayString] = match;
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid day key: ${key}`);
  }

  return [year, month, day];
}

function formatDayKey(year: number, month: number, day: number): DayKey {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function validateDayStartHour(dayStartHour: number): void {
  if (!Number.isInteger(dayStartHour) || dayStartHour < 0 || dayStartHour > 23) {
    throw new RangeError('dayStartHour must be an integer between 0 and 23');
  }
}

export function dayKeyOf(timestamp: number, dayStartHour: number): DayKey {
  validateDayStartHour(dayStartHour);
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError('timestamp must be a valid epoch timestamp');
  }

  const key = formatDayKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return date.getHours() < dayStartHour ? addDays(key, -1) : key;
}

export function dayStart(key: DayKey, dayStartHour: number): number {
  validateDayStartHour(dayStartHour);
  const [year, month, day] = dateParts(key);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(dayStartHour, 0, 0, 0);
  return date.getTime();
}

export function addDays(key: DayKey, amount: number): DayKey {
  if (!Number.isInteger(amount)) {
    throw new RangeError('amount must be an integer');
  }

  const [year, month, day] = dateParts(key);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day + amount);
  return formatDayKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function weekdayOf(key: DayKey): number {
  const [year, month, day] = dateParts(key);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (date.getUTCDay() + 6) % 7;
}

export function weekRange(key: DayKey, weekStart: WeekStart): { start: DayKey; end: DayKey } {
  const weekday = weekdayOf(key);
  const daysSinceStart = weekStart === 'sunday' ? (weekday + 1) % 7 : weekday;
  const start = addDays(key, -daysSinceStart);
  return { start, end: addDays(start, 6) };
}

export function splitAtDayBoundaries(
  start: number,
  end: number,
  dayStartHour: number
): { day: DayKey; startedAt: number; durationMs: number }[] {
  validateDayStartHour(dayStartHour);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new RangeError('start and end must be valid epoch timestamps');
  }

  const segments: { day: DayKey; startedAt: number; durationMs: number }[] = [];
  let cursor = start;

  while (cursor < end) {
    const day = dayKeyOf(cursor, dayStartHour);
    const nextBoundary = dayStart(addDays(day, 1), dayStartHour);
    const segmentEnd = Math.min(end, nextBoundary);
    segments.push({ day, startedAt: cursor, durationMs: segmentEnd - cursor });
    cursor = segmentEnd;
  }

  return segments;
}
