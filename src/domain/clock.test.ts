import { describe, expect, it } from 'vitest';
import { emptyData } from './schema';
import type { AppData, Item } from './types';
import {
  currentClock,
  nextIntervalEnd,
  pauseRun,
  resetClock,
  restartClock,
  settleRun,
  startItem,
} from './clock';
import { reduce } from './reduce';

const minute = 60 * 1000;
const hour = 60 * minute;

function dataWithTimeItems(...ids: string[]): AppData {
  const data = emptyData(new Date(2024, 0, 1, 9).getTime());
  const items: Item[] = ids.map((id) => ({
    id,
    name: id,
    groupId: null,
    kind: 'task',
    completion: 'time',
    goals: [{ from: '2024-01-01', target: 60 }],
    timerStyle: 'free',
    createdAt: 1,
    updatedAt: 1,
  }));
  return { ...data, items };
}

describe('timer clock', () => {
  it('should log elapsed time when a run is paused', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const running = startItem(dataWithTimeItems('read'), 'read', start);
    const paused = pauseRun(running, start + 30 * minute);

    expect(paused.run).toBeNull();
    expect(paused.sessions).toHaveLength(1);
    expect(paused.sessions[0].durationMs).toBe(30 * minute);
    expect(paused.clocks.read.elapsedMs).toBe(30 * minute);
  });

  it('should pause the active item when switching and resume each saved clock', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const firstRun = startItem(dataWithTimeItems('read', 'write'), 'read', start);
    const secondRun = startItem(firstRun, 'write', start + 10 * minute);
    const resumedRead = startItem(secondRun, 'read', start + 20 * minute);

    expect(secondRun.sessions[0].durationMs).toBe(10 * minute);
    expect(currentClock(resumedRead, 'read', start + 25 * minute).elapsedMs).toBe(15 * minute);
    expect(resumedRead.sessions[1].durationMs).toBe(10 * minute);
  });

  it('should end an unpinned quick session when starting another item directly', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const quick: Item = {
      id: 'quick',
      name: '',
      kind: 'quick',
      groupId: null,
      completion: 'time',
      goals: [],
      timerStyle: 'free',
      number: 1,
      day: '2024-01-01',
      createdAt: start,
      updatedAt: start,
    };
    const data = dataWithTimeItems('habit');
    const pinned = {
      ...data,
      items: [quick, ...data.items],
      cardItemId: quick.id,
      clocks: {
        [quick.id]: {
          style: 'free' as const,
          phase: 'focus' as const,
          round: 1 as const,
          elapsedMs: 0,
          day: '2024-01-01',
        },
      },
    };
    const quickRun = startItem(pinned, quick.id, start);
    const switched = startItem(quickRun, 'habit', start + 5 * minute);

    expect(switched.cardItemId).toBeNull();
    expect(switched.clocks[quick.id]).toBeUndefined();
    expect(switched.sessions).toHaveLength(1);
    expect(switched.sessions[0]).toMatchObject({
      itemId: quick.id,
      durationMs: 5 * minute,
    });
    expect(switched.run?.itemId).toBe('habit');
  });

  it('should split a run across day boundaries', () => {
    const start = new Date(2024, 0, 1, 23, 50).getTime();
    const running = startItem(dataWithTimeItems('read'), 'read', start);
    const paused = pauseRun(running, start + 30 * minute);

    expect(paused.sessions.map(({ day, durationMs }) => [day, durationMs])).toEqual([
      ['2024-01-01', 10 * minute],
      ['2024-01-02', 20 * minute],
    ]);
  });

  it('should cap a settled free run at twelve hours and record the automatic stop', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const running = startItem(dataWithTimeItems('read'), 'read', start);
    const settled = settleRun(running, start + 13 * hour);

    expect(settled.run).toBeNull();
    expect(settled.sessions.reduce((total, session) => total + session.durationMs, 0)).toBe(
      12 * hour
    );
    expect(settled.meta.autoStop).toEqual({ itemId: 'read', at: start + 12 * hour });
  });

  it('should derive current elapsed time from the run timestamps', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const running = startItem(dataWithTimeItems('read'), 'read', start);

    expect(currentClock(running, 'read', start + 30 * minute).elapsedMs).toBe(30 * minute);
    expect(currentClock(running, 'read', start + 30 * minute + 500).elapsedMs).toBe(
      30 * minute + 500
    );
  });

  it('should stop a focus session at its end and start a break at full length', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const data = dataWithTimeItems('read');
    data.items[0].timerStyle = 'sessions';
    const running = startItem(data, 'read', start);
    const settled = settleRun(running, start + 40 * minute);

    expect(settled.run).toBeNull();
    expect(settled.sessions).toHaveLength(1);
    expect(settled.sessions[0].durationMs).toBe(25 * minute);
    expect(settled.clocks.read).toMatchObject({
      style: 'sessions',
      phase: 'break',
      round: 1,
      elapsedMs: 0,
    });
    expect(nextIntervalEnd(settled, start + 40 * minute)).toBeNull();
  });

  it('should advance from a break to the next focus session without logging break time', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const data = dataWithTimeItems('read');
    data.items[0].timerStyle = 'sessions';
    const afterFocus = settleRun(startItem(data, 'read', start), start + 25 * minute);
    const breakRun = startItem(afterFocus, 'read', start + 25 * minute);
    const afterBreak = settleRun(breakRun, start + 30 * minute);

    expect(afterBreak.sessions).toHaveLength(1);
    expect(afterBreak.clocks.read).toMatchObject({
      phase: 'focus',
      round: 2,
      elapsedMs: 0,
    });
  });

  it('should take a long break after round four and restart at round one', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const data = dataWithTimeItems('read');
    data.items[0].timerStyle = 'sessions';
    data.clocks.read = {
      style: 'sessions',
      phase: 'focus',
      round: 4,
      elapsedMs: 0,
      day: '2024-01-01',
    };

    let updated = settleRun(startItem(data, 'read', start), start + 25 * minute);
    expect(updated.clocks.read).toMatchObject({
      phase: 'long-break',
      round: 4,
      elapsedMs: 0,
    });

    updated = settleRun(startItem(updated, 'read', start + 25 * minute), start + 40 * minute);
    expect(updated.clocks.read).toMatchObject({
      phase: 'focus',
      round: 1,
      elapsedMs: 0,
    });
  });

  it('should reset a saved focus-session round when starting on a new day', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const nextDay = new Date(2024, 0, 2, 9).getTime();
    const data = dataWithTimeItems('read');
    data.items[0].timerStyle = 'sessions';
    data.clocks.read = {
      style: 'sessions',
      phase: 'break',
      round: 3,
      elapsedMs: 2 * minute,
      day: '2024-01-01',
    };
    data.sessions.push({
      id: 'existing',
      itemId: 'read',
      day: '2024-01-01',
      startedAt: start,
      durationMs: minute,
    });

    const running = startItem(data, 'read', nextDay);

    expect(running.run?.clock).toMatchObject({
      phase: 'focus',
      round: 1,
      elapsedMs: 0,
      day: '2024-01-02',
    });
    expect(running.sessions).toEqual(data.sessions);
  });

  it('should restart a running clock in the current style while preserving tracked time', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const data = dataWithTimeItems('read');
    const running = startItem(data, 'read', start + 12 * minute);
    running.items[0].timerStyle = 'sessions';

    const restarted = restartClock(running, 'read', start + 24 * minute);

    expect(restarted.sessions).toHaveLength(1);
    expect(restarted.sessions[0].durationMs).toBe(12 * minute);
    expect(restarted.run).toMatchObject({
      itemId: 'read',
      startedAt: start + 24 * minute,
      clock: {
        style: 'sessions',
        phase: 'focus',
        round: 1,
        elapsedMs: 0,
      },
    });
    expect(nextIntervalEnd(restarted, start + 24 * minute)).toBe(start + 49 * minute);
  });

  it('should stop a running clock at the start and keep the tracked time when resetting it', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const running = startItem(dataWithTimeItems('read'), 'read', start);

    const reset = resetClock(running, 'read', start + 10 * minute);

    expect(reset.run).toBeNull();
    expect(reset.sessions).toHaveLength(1);
    expect(reset.sessions[0].durationMs).toBe(10 * minute);
    expect(currentClock(reset, 'read', start + 20 * minute).elapsedMs).toBe(0);
  });

  it('should keep a paused clock paused when restarting it', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const data = dataWithTimeItems('read');
    data.clocks.read = {
      style: 'free',
      phase: 'focus',
      round: 1,
      elapsedMs: 12 * minute,
      day: '2024-01-01',
    };
    data.items[0].timerStyle = 'sessions';

    const restarted = restartClock(data, 'read', start);

    expect(restarted.run).toBeNull();
    expect(restarted.clocks.read).toMatchObject({
      style: 'sessions',
      phase: 'focus',
      round: 1,
      elapsedMs: 0,
    });
  });

  it('should return the next phase end or the free-run cap', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const sessionsData = dataWithTimeItems('read');
    sessionsData.items[0].timerStyle = 'sessions';
    const sessionsRun = startItem(sessionsData, 'read', start);
    const freeRun = startItem(dataWithTimeItems('read'), 'read', start);

    expect(nextIntervalEnd(sessionsRun, start)).toBe(start + 25 * minute);
    expect(nextIntervalEnd(freeRun, start)).toBe(start + 12 * hour);
    expect(nextIntervalEnd(dataWithTimeItems('read'), start)).toBeNull();
  });

  it('should route the timer actions through reduce, including snapshot restore', () => {
    const start = new Date(2024, 0, 1, 9).getTime();
    const data = dataWithTimeItems('read');
    const running = reduce(data, { type: 'start', itemId: 'read' }, start);
    const paused = reduce(running, { type: 'pause' }, start + minute);
    const restored = reduce(data, { type: 'restore', snapshot: paused }, start + 2 * minute);

    expect(paused.run).toBeNull();
    expect(paused.sessions[0].durationMs).toBe(minute);
    expect(restored).toBe(paused);
    expect(reduce(running, { type: 'settle' }, start + 12 * hour).run).toBeNull();
  });
});
