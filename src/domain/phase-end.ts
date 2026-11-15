import { phaseDuration } from './clock';
import { displayName } from './items';
import type { AppData, ItemClock } from './types';

export interface PhaseEnd {
  itemId: string;
  /** Display name of the item at the time of the end. */
  name: string;
  /** Timestamp when the phase ended. */
  endedAt: number;
  /** The run's clock snapshot before the end. */
  started: ItemClock;
  /** The saved clock after the end. */
  settled: ItemClock;
}

export function phaseEndOf(before: AppData, after: AppData): PhaseEnd | null {
  const { run } = before;
  if (run === null || run.clock.style !== 'sessions' || after.run?.itemId === run.itemId) {
    return null;
  }

  const settled = after.clocks[run.itemId];
  if (!settled || (settled.phase === run.clock.phase && settled.round === run.clock.round)) {
    return null;
  }

  const item = after.items.find((candidate) => candidate.id === run.itemId);
  return {
    itemId: run.itemId,
    name: item ? displayName(item) : 'Timer',
    endedAt: run.startedAt + Math.max(0, phaseDuration(run.clock) - run.clock.elapsedMs),
    started: run.clock,
    settled,
  };
}

export function intervalEndMessage(started: ItemClock, settled: ItemClock): string {
  if (started.phase === 'focus') {
    return `Focus ${started.round} done. ${settled.phase === 'long-break' ? 'Long break' : 'Break'} next.`;
  }
  if (started.phase === 'long-break') {
    return 'Long break done. Focus 1 next.';
  }
  return `Break done. Focus ${settled.round} next.`;
}

export function missedEndMessage(started: ItemClock, settled: ItemClock, timeText: string): string {
  if (started.phase === 'focus') {
    return `Focus ${started.round} ended at ${timeText}. ${settled.phase === 'long-break' ? 'Long break' : 'Break'} next.`;
  }
  if (started.phase === 'long-break') {
    return `Long break ended at ${timeText}. Focus 1 next.`;
  }
  return `Break ended at ${timeText}. Focus ${settled.round} next.`;
}
