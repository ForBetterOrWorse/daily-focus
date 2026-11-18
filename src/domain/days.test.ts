import { describe, expect, it } from 'vitest';
import { addDays, dayKeyOf, dayStart, splitAtDayBoundaries, weekdayOf, weekRange } from './days';

const minute = 60 * 1000;

describe('day helpers', () => {
  it('should assign times before the day start to the previous day', () => {
    const beforeDayStart = new Date(2024, 0, 2, 1, 30).getTime();
    const atDayStart = new Date(2024, 0, 2, 2, 0).getTime();

    expect(dayKeyOf(beforeDayStart, 2)).toBe('2024-01-01');
    expect(dayKeyOf(atDayStart, 2)).toBe('2024-01-02');
  });

  it('should create local day starts and add calendar days across month boundaries', () => {
    expect(dayStart('2024-01-02', 2)).toBe(new Date(2024, 0, 2, 2).getTime());
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
  });

  it('should return Monday-based weekday indexes', () => {
    expect(weekdayOf('2024-01-01')).toBe(0);
    expect(weekdayOf('2024-01-07')).toBe(6);
  });

  it('should return an inclusive week range for Monday and Sunday starts', () => {
    expect(weekRange('2024-01-02', 'monday')).toEqual({
      start: '2024-01-01',
      end: '2024-01-07',
    });
    expect(weekRange('2024-01-02', 'sunday')).toEqual({
      start: '2023-12-31',
      end: '2024-01-06',
    });
  });

  it('should split sessions at local day boundaries', () => {
    const start = new Date(2024, 0, 1, 23, 50).getTime();
    const end = new Date(2024, 0, 2, 0, 20).getTime();

    expect(splitAtDayBoundaries(start, end, 0)).toEqual([
      { day: '2024-01-01', startedAt: start, durationMs: 10 * minute },
      { day: '2024-01-02', startedAt: start + 10 * minute, durationMs: 20 * minute },
    ]);
  });

});
