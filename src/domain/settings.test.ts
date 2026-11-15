import { describe, expect, it } from 'vitest';
import { activitiesOn } from './activity';
import { dayKeyOf } from './days';
import { emptyData } from './schema';
import { MAX_SKIPS_PER_MONTH, updateSettings } from './settings';
import type { AppData, HabitItem, Session } from './types';

const now = new Date(2024, 0, 17, 9).getTime();
const later = now + 1000;

const habit: HabitItem = {
  id: 'stretch',
  name: 'Stretch',
  kind: 'habit',
  groupId: null,
  completion: 'check',
  goals: [],
  days: [0, 1, 2, 3, 4, 5, 6],
  createdAt: now,
  updatedAt: now,
};

function dataWith(parts: Partial<AppData> = {}): AppData {
  return { ...emptyData(now), ...parts };
}

describe('updateSettings', () => {
  it('should merge the patch and stamp updatedAt', () => {
    const next = updateSettings(dataWith(), { weekStart: 'sunday', skipsPerMonth: 4 }, later);
    expect(next.settings).toMatchObject({
      weekStart: 'sunday',
      skipsPerMonth: 4,
      updatedAt: later,
    });
  });

  it('should cap skips per month at the maximum', () => {
    const next = updateSettings(dataWith(), { skipsPerMonth: 50 }, later);
    expect(next.settings.skipsPerMonth).toBe(MAX_SKIPS_PER_MONTH);
  });

  it('should leave unpatched fields alone', () => {
    const data = dataWith();
    const next = updateSettings(data, { weekStart: 'sunday' }, later);
    expect(next.settings.dayStartHour).toBe(data.settings.dayStartHour);
    expect(next.settings.skipsPerMonth).toBe(data.settings.skipsPerMonth);
  });

  it('should move a 1 AM session to the previous day when the day starts at 2', () => {
    const startedAt = new Date(2024, 0, 17, 1).getTime();
    const startOfNight = dayKeyOf(startedAt, 0);
    const session: Session = {
      id: 's',
      itemId: 'essay',
      day: startOfNight,
      startedAt,
      durationMs: 20 * 60_000,
    };
    const task = { ...habit, id: 'essay', kind: 'task' as const, completion: 'time' as const };
    const data = dataWith({
      items: [task],
      sessions: [session],
      settings: { ...emptyData(now).settings, dayStartHour: 0 },
    });
    expect(activitiesOn(data, '2024-01-17')).toHaveLength(1);

    const next = updateSettings(data, { dayStartHour: 2 }, later);
    expect(dayKeyOf(startedAt, next.settings.dayStartHour)).toBe('2024-01-16');
    expect(activitiesOn(next, '2024-01-16')).toHaveLength(1);
    expect(activitiesOn(next, '2024-01-17')).toHaveLength(0);
  });

  it('should drop a skip on a day that gains activity from the move', () => {
    const startedAt = new Date(2024, 0, 17, 1).getTime();
    const task = { ...habit, id: 'essay', kind: 'task' as const, completion: 'time' as const };
    const data = dataWith({
      items: [task],
      sessions: [
        { id: 's', itemId: 'essay', day: '2024-01-17', startedAt, durationMs: 20 * 60_000 },
      ],
      skips: ['2024-01-16'],
      settings: { ...emptyData(now).settings, dayStartHour: 0 },
    });
    expect(updateSettings(data, { dayStartHour: 2 }, later).skips).toEqual([]);
  });
});
