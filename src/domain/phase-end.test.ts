import { describe, expect, it } from 'vitest';
import { pauseRun, settleRun, startItem } from './clock';
import { intervalEndMessage, missedEndMessage, phaseEndOf } from './phase-end';
import { emptyData } from './schema';
import type { AppData, Item, ItemClock } from './types';

const minute = 60 * 1000;
const start = new Date(2024, 0, 1, 9).getTime();

function dataWithTimeItems(style: 'sessions' | 'free', ...ids: string[]): AppData {
  const data = emptyData(start);
  const items: Item[] = ids.map((id) => ({
    id,
    name: id,

    kind: 'task',
    completion: 'time',
    goals: [{ from: '2024-01-01', target: 60 }],
    timerStyle: style,
    createdAt: 1,
    updatedAt: 1,
  }));
  return { ...data, items };
}

function clockOf(phase: ItemClock['phase'], round: ItemClock['round']): ItemClock {
  return { style: 'sessions', phase, round, elapsedMs: 0, day: '2024-01-01' };
}

describe('phaseEndOf', () => {
  it('should describe a sessions phase that ended', () => {
    const running = startItem(dataWithTimeItems('sessions', 'read'), 'read', start);
    const settled = settleRun(running, start + 26 * minute);
    const end = phaseEndOf(running, settled);

    expect(end).not.toBeNull();
    expect(end?.itemId).toBe('read');
    expect(end?.name).toBe('read');
    expect(end?.endedAt).toBe(start + 25 * minute);
    expect(end?.started.phase).toBe('focus');
    expect(end?.settled.phase).toBe('break');
  });

  it('should return null when the run is paused before the phase ends', () => {
    const running = startItem(dataWithTimeItems('sessions', 'read'), 'read', start);
    const paused = pauseRun(running, start + 10 * minute);

    expect(phaseEndOf(running, paused)).toBeNull();
  });

  it('should return null when the phase is still running', () => {
    const running = startItem(dataWithTimeItems('sessions', 'read'), 'read', start);

    expect(phaseEndOf(running, settleRun(running, start + 10 * minute))).toBeNull();
  });

  it('should return null for a free run', () => {
    const running = startItem(dataWithTimeItems('free', 'read'), 'read', start);
    const paused = pauseRun(running, start + 30 * minute);

    expect(phaseEndOf(running, paused)).toBeNull();
  });

  it('should return null when there was no run', () => {
    const idle = dataWithTimeItems('sessions', 'read');

    expect(phaseEndOf(idle, idle)).toBeNull();
  });

  it('should return the end when another item was started after the phase ended', () => {
    const running = startItem(dataWithTimeItems('sessions', 'read', 'write'), 'read', start);
    const switched = startItem(running, 'write', start + 30 * minute);
    const end = phaseEndOf(running, switched);

    expect(end?.itemId).toBe('read');
    expect(end?.endedAt).toBe(start + 25 * minute);
    expect(end?.settled.phase).toBe('break');
  });

  it('should return null when another item was started before the phase ended', () => {
    const running = startItem(dataWithTimeItems('sessions', 'read', 'write'), 'read', start);
    const switched = startItem(running, 'write', start + 10 * minute);

    expect(phaseEndOf(running, switched)).toBeNull();
  });
});

describe('intervalEndMessage', () => {
  it('should announce a break after a focus round', () => {
    expect(intervalEndMessage(clockOf('focus', 1), clockOf('break', 1))).toBe(
      'Focus 1 done. Break next.'
    );
  });

  it('should announce a long break after focus 4', () => {
    expect(intervalEndMessage(clockOf('focus', 4), clockOf('long-break', 4))).toBe(
      'Focus 4 done. Long break next.'
    );
  });

  it('should announce focus 1 after a long break', () => {
    expect(intervalEndMessage(clockOf('long-break', 4), clockOf('focus', 1))).toBe(
      'Long break done. Focus 1 next.'
    );
  });

  it('should announce the next focus round after a break', () => {
    expect(intervalEndMessage(clockOf('break', 1), clockOf('focus', 2))).toBe(
      'Break done. Focus 2 next.'
    );
  });
});

describe('missedEndMessage', () => {
  it('should include the end time after a focus round', () => {
    expect(missedEndMessage(clockOf('focus', 2), clockOf('break', 2), '10:25 AM')).toBe(
      'Focus 2 ended at 10:25 AM. Break next.'
    );
  });

  it('should include the end time after focus 4', () => {
    expect(missedEndMessage(clockOf('focus', 4), clockOf('long-break', 4), '10:25 AM')).toBe(
      'Focus 4 ended at 10:25 AM. Long break next.'
    );
  });

  it('should include the end time after a long break', () => {
    expect(missedEndMessage(clockOf('long-break', 4), clockOf('focus', 1), '10:25 AM')).toBe(
      'Long break ended at 10:25 AM. Focus 1 next.'
    );
  });

  it('should include the end time after a break', () => {
    expect(missedEndMessage(clockOf('break', 1), clockOf('focus', 2), '10:25 AM')).toBe(
      'Break ended at 10:25 AM. Focus 2 next.'
    );
  });
});
