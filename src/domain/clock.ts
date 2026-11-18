import { dayKeyOf, splitAtDayBoundaries } from './days';
import type { AppData, ItemClock } from './types';

const MAX_RUN_MS = 12 * 60 * 60 * 1000;
export const HEARTBEAT_MS = 30 * 1000;
const STALE_RUN_MS = 5 * 60 * 1000;
const FOCUS_MS = 25 * 60 * 1000;
const BREAK_MS = 5 * 60 * 1000;
const LONG_BREAK_MS = 15 * 60 * 1000;

export function phaseDuration(clock: ItemClock): number {
  if (clock.phase === 'focus') {
    return FOCUS_MS;
  }
  return clock.phase === 'break' ? BREAK_MS : LONG_BREAK_MS;
}

function initialClock(style: ItemClock['style'], day: string): ItemClock {
  return { style, phase: 'focus', round: 1, elapsedMs: 0, day };
}

function clockFor(data: AppData, itemId: string, now: number): ItemClock {
  const item = data.items.find((candidate) => candidate.id === itemId);
  if (!item || item.completion !== 'time') {
    throw new RangeError(`Cannot start a timer for unknown time item: ${itemId}`);
  }

  const day = dayKeyOf(now, data.settings.dayStartHour);
  const style = item.timerStyle ?? 'sessions';
  const saved = data.clocks[itemId];
  if (saved?.day === day && saved.style === style) {
    return saved;
  }

  return initialClock(style, day);
}

function runDuration(startedAt: number, now: number): number {
  return Math.min(Math.max(0, now - startedAt), MAX_RUN_MS);
}

function elapsedRunDuration(run: AppData['run'], now: number): number {
  if (run === null) {
    return 0;
  }

  const durationMs = runDuration(run.startedAt, now);
  if (run.clock.style === 'free') {
    return durationMs;
  }
  return Math.min(durationMs, Math.max(0, phaseDuration(run.clock) - run.clock.elapsedMs));
}

function nextPhase(clock: ItemClock): ItemClock {
  if (clock.phase === 'focus') {
    return {
      ...clock,
      phase: clock.round === 4 ? 'long-break' : 'break',
      elapsedMs: 0,
    };
  }

  if (clock.phase === 'long-break') {
    return { ...clock, phase: 'focus', round: 1, elapsedMs: 0 };
  }

  return {
    ...clock,
    phase: 'focus',
    round: Math.min(clock.round + 1, 4) as ItemClock['round'],
    elapsedMs: 0,
  };
}

export function currentClock(data: AppData, itemId: string, now: number): ItemClock {
  if (data.run?.itemId === itemId) {
    return {
      ...data.run.clock,
      elapsedMs: data.run.clock.elapsedMs + elapsedRunDuration(data.run, now),
    };
  }

  return clockFor(data, itemId, now);
}

export function startItem(data: AppData, itemId: string, now: number): AppData {
  if (data.run?.itemId === itemId) {
    return data;
  }

  const paused = data.run === null ? data : pauseRun(data, now);
  const clock = clockFor(paused, itemId, now);
  const pinnedItemId = data.cardItemId;
  const endsPinnedItem = pinnedItemId !== itemId;
  const clocks = { ...paused.clocks };
  if (
    endsPinnedItem &&
    pinnedItemId !== null &&
    data.items.find((item) => item.id === pinnedItemId)?.kind === 'quick'
  ) {
    delete clocks[pinnedItemId];
  }

  return {
    ...paused,
    cardItemId: endsPinnedItem ? null : itemId,
    clocks,
    run: { itemId, startedAt: now, lastSeenAt: now, clock },
  };
}

export function pauseRun(data: AppData, now: number): AppData {
  const { run } = data;
  if (run === null) {
    return data;
  }

  const durationMs = elapsedRunDuration(run, now);
  const phaseEndAt =
    run.clock.style === 'sessions'
      ? run.startedAt + Math.max(0, phaseDuration(run.clock) - run.clock.elapsedMs)
      : null;
  const sessions =
    durationMs === 0 || run.clock.phase !== 'focus'
      ? []
      : splitAtDayBoundaries(
          run.startedAt,
          run.startedAt + durationMs,
          data.settings.dayStartHour
        ).map((segment) => ({
          id: crypto.randomUUID(),
          itemId: run.itemId,
          ...segment,
        }));
  let clock = { ...run.clock, elapsedMs: run.clock.elapsedMs + durationMs };
  if (phaseEndAt !== null && now >= phaseEndAt) {
    clock = nextPhase(run.clock);
    const day = dayKeyOf(phaseEndAt, data.settings.dayStartHour);
    if (clock.day !== day) {
      clock = initialClock(clock.style, day);
    }
  }

  return {
    ...data,
    sessions: [...data.sessions, ...sessions],
    clocks: {
      ...data.clocks,
      [run.itemId]: clock,
    },
    run: null,
  };
}

export function restartClock(data: AppData, itemId: string, now: number): AppData {
  const item = data.items.find((candidate) => candidate.id === itemId);
  if (!item) {
    throw new RangeError(`Cannot restart a timer for unknown item: ${itemId}`);
  }

  const wasRunning = data.run?.itemId === itemId;
  const paused = wasRunning ? pauseRun(data, now) : data;
  const clocks = { ...paused.clocks };
  delete clocks[itemId];

  if (item.completion !== 'time') {
    return { ...paused, clocks };
  }

  const day = dayKeyOf(now, data.settings.dayStartHour);
  const reset = {
    ...paused,
    clocks: {
      ...clocks,
      [itemId]: initialClock(item.timerStyle ?? 'sessions', day),
    },
  };
  return wasRunning ? startItem(reset, itemId, now) : reset;
}

export function resetClock(data: AppData, itemId: string, now: number): AppData {
  const paused = data.run?.itemId === itemId ? pauseRun(data, now) : data;
  return restartClock(paused, itemId, now);
}

export function settleRun(data: AppData, now: number): AppData {
  const { run } = data;
  if (run === null) {
    return data;
  }

  if (run.clock.style === 'sessions') {
    const phaseEndAt = run.startedAt + Math.max(0, phaseDuration(run.clock) - run.clock.elapsedMs);
    return now >= phaseEndAt ? pauseRun(data, phaseEndAt) : data;
  }

  if (run.lastSeenAt !== undefined && now - run.lastSeenAt > STALE_RUN_MS) {
    return pauseRun(data, run.lastSeenAt);
  }

  if (now - run.startedAt < MAX_RUN_MS) {
    return data;
  }

  const settledAt = run.startedAt + MAX_RUN_MS;
  const paused = pauseRun(data, settledAt);
  return {
    ...paused,
    meta: {
      ...paused.meta,
      autoStop: { itemId: run.itemId, at: settledAt },
    },
  };
}

export function touchRun(data: AppData, now: number): AppData {
  const settled = settleRun(data, now);
  if (settled.run === null) {
    return settled;
  }
  return { ...settled, run: { ...settled.run, lastSeenAt: now } };
}

export function nextIntervalEnd(data: AppData, _now: number): number | null {
  const { run } = data;
  if (run === null) {
    return null;
  }

  const durationMs =
    run.clock.style === 'free'
      ? MAX_RUN_MS
      : Math.max(0, phaseDuration(run.clock) - run.clock.elapsedMs);
  return run.startedAt + durationMs;
}
