import { weekRange } from './days';
import { displayName } from './items';
import type { AppData, DayKey, ItemKind } from './types';

export const NO_GROUP_NAME = 'No group';

export interface GroupTotal {
  groupId: string | null;
  name: string;
  ms: number;
}

export interface ItemTotal {
  itemId: string;
  name: string;
  kind: ItemKind;
  groupName: string | null;
  ms: number;
}

export interface WeekStats {
  totalMs: number;
  byGroup: GroupTotal[];
  byItem: ItemTotal[];
}

function byTimeThenName<T extends { name: string; ms: number }>(a: T, b: T): number {
  return b.ms - a.ms || a.name.localeCompare(b.name);
}

export function weekStats(data: AppData, weekStartKey: DayKey): WeekStats {
  const { start, end } = weekRange(weekStartKey, data.settings.weekStart);
  const itemsById = new Map(data.items.map((item) => [item.id, item]));
  const groupNames = new Map(data.groups.map((group) => [group.id, group.name]));
  const groupTotals = new Map<string | null, number>();
  const itemTotals = new Map<string, number>();
  let totalMs = 0;

  for (const session of data.sessions) {
    const item = itemsById.get(session.itemId);
    if (!item || session.day < start || session.day > end) {
      continue;
    }
    totalMs += session.durationMs;
    itemTotals.set(item.id, (itemTotals.get(item.id) ?? 0) + session.durationMs);
    groupTotals.set(item.groupId, (groupTotals.get(item.groupId) ?? 0) + session.durationMs);
  }

  const byGroup = [...groupTotals].map(([groupId, ms]) => ({
    groupId,
    name: groupId === null ? NO_GROUP_NAME : (groupNames.get(groupId) ?? NO_GROUP_NAME),
    ms,
  }));

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
        groupName: item.groupId === null ? null : (groupNames.get(item.groupId) ?? null),
        ms,
      },
    ];
  });

  return {
    totalMs,
    byGroup: byGroup.sort(byTimeThenName),
    byItem: byItem.sort(byTimeThenName),
  };
}
