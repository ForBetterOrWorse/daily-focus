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
}

function byTimeThenName<T extends { name: string; ms: number }>(a: T, b: T): number {
  return b.ms - a.ms || a.name.localeCompare(b.name);
}

export function weekStats(data: AppData, weekStartKey: DayKey): WeekStats {
  const { start, end } = weekRange(weekStartKey, data.settings.weekStart);
  const itemsById = new Map(data.items.map((item) => [item.id, item]));
  const itemTotals = new Map<string, number>();
  let totalMs = 0;

  for (const session of data.sessions) {
    const item = itemsById.get(session.itemId);
    if (!item || session.day < start || session.day > end) {
      continue;
    }
    totalMs += session.durationMs;
    itemTotals.set(item.id, (itemTotals.get(item.id) ?? 0) + session.durationMs);
  }

  const byItem = [...itemTotals].flatMap(([itemId, ms]) => {
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

  return {
    totalMs,
    byItem: byItem.sort(byTimeThenName),
  };
}
