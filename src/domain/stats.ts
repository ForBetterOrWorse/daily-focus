import { weekRange } from './days';
import { displayName } from './items';
import type { AppData, DayKey, ItemKind } from './types';

export interface ItemTotal {
  itemId: string;
  name: string;
  kind: ItemKind;
  ms: number;
}

export interface WeekStats {
  totalMs: number;
  byItem: ItemTotal[];
  byStandaloneSession: ItemTotal[];
}

function byTimeThenName<T extends { name: string; ms: number }>(a: T, b: T): number {
  return b.ms - a.ms || a.name.localeCompare(b.name);
}

export function weekStats(data: AppData, weekStartKey: DayKey): WeekStats {
  const { start, end } = weekRange(weekStartKey, data.settings.weekStart);
  const itemsById = new Map(data.items.map((item) => [item.id, item]));
  const itemTotals = new Map<string, number>();
  const standaloneSessionTotals = new Map<string, number>();
  let totalMs = 0;

  for (const session of data.sessions) {
    const item = itemsById.get(session.itemId);
    if (!item || session.day < start || session.day > end) {
      continue;
    }
    totalMs += session.durationMs;
    const totals = item.kind === 'quick' ? standaloneSessionTotals : itemTotals;
    totals.set(item.id, (totals.get(item.id) ?? 0) + session.durationMs);
  }

  function toItemTotals(totals: Map<string, number>): ItemTotal[] {
    return [...totals].flatMap(([itemId, ms]) => {
      const item = itemsById.get(itemId);
      if (!item) {
        return [];
      }
      return [
        {
          itemId,
          name: displayName(item),
          kind: item.kind,
          ms,
        },
      ];
    });
  }

  return {
    totalMs,
    byItem: toItemTotals(itemTotals).sort(byTimeThenName),
    byStandaloneSession: toItemTotals(standaloneSessionTotals).sort(byTimeThenName),
  };
}
