import { openApp } from './card';
import { dayKeyOf } from './days';
import { parseData } from './schema';
import type { AppData, Meta } from './types';

export function exportJson(data: AppData, now: number): { fileName: string; text: string } {
  return {
    fileName: `daily-focus-${dayKeyOf(now, 0)}.json`,
    text: JSON.stringify({ ...data, meta: { ...data.meta, lastExportAt: now } }, null, 2),
  };
}

export type ImportPreview =
  | { ok: true; data: AppData; items: number; sessions: number; exportedAt: number | null }
  | { ok: false };

export function importPreview(json: unknown): ImportPreview {
  try {
    const data = parseData(json);
    return {
      ok: true,
      data,
      items: data.items.length,
      sessions: data.sessions.length,
      exportedAt: data.meta.lastExportAt,
    };
  } catch {
    return { ok: false };
  }
}

function newerByKey<T extends { updatedAt: number }>(
  local: T[],
  incoming: T[],
  keyOf: (entry: T) => string
): T[] {
  const merged = new Map(local.map((entry) => [keyOf(entry), entry]));
  for (const entry of incoming) {
    const current = merged.get(keyOf(entry));
    if (current === undefined || entry.updatedAt > current.updatedAt) {
      merged.set(keyOf(entry), entry);
    }
  }
  return [...merged.values()];
}

function mergeTombstones(
  local: Record<string, number>,
  incoming: Record<string, number>
): Record<string, number> {
  const merged = { ...local };
  for (const [id, at] of Object.entries(incoming)) {
    merged[id] = Math.max(merged[id] ?? at, at);
  }
  return merged;
}

function mergeOrder(
  local: string[],
  incoming: string[],
  isValid: (id: string) => boolean
): string[] {
  const seen = new Set<string>();
  return [...local, ...incoming].filter((id) => {
    if (seen.has(id) || !isValid(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function mergeLastQuickNumber(a: Meta['lastQuickNumber'], b: Meta['lastQuickNumber']) {
  if (a === null || b === null) {
    return a ?? b;
  }
  if (a.day !== b.day) {
    return a.day > b.day ? a : b;
  }
  return b.number > a.number ? b : a;
}

export function mergeData(local: AppData, incoming: AppData, now: number): AppData {
  const tombstones = mergeTombstones(local.tombstones, incoming.tombstones);
  const isLive = (entry: { id: string; updatedAt: number }): boolean =>
    (tombstones[entry.id] ?? -1) < entry.updatedAt;

  const candidates = newerByKey(local.items, incoming.items, (item) => item.id);
  const removedIds = new Set(candidates.filter((item) => !isLive(item)).map((item) => item.id));
  const groups = newerByKey(local.groups, incoming.groups, (group) => group.id).filter(isLive);
  const groupIds = new Set(groups.map((group) => group.id));
  const items = candidates
    .filter((item) => !removedIds.has(item.id))
    .map((item) =>
      item.groupId !== null && !groupIds.has(item.groupId) ? { ...item, groupId: null } : item
    );
  const itemById = new Map(items.map((item) => [item.id, item]));
  const orderFor = (section: 'habits' | 'tasks') =>
    mergeOrder(local.order[section], incoming.order[section], (id) => {
      const kind = itemById.get(id)?.kind;
      return section === 'habits' ? kind === 'habit' : kind === 'task';
    });

  const sessions = new Map<string, AppData['sessions'][number]>();
  for (const session of [...local.sessions, ...incoming.sessions]) {
    if (!removedIds.has(session.itemId) && !sessions.has(session.id)) {
      sessions.set(session.id, session);
    }
  }

  const clocks = Object.fromEntries(
    Object.entries(local.clocks).filter(([itemId]) => itemById.has(itemId))
  );
  const runIsLive = local.run !== null && itemById.has(local.run.itemId);
  const autoStopIsLive = local.meta.autoStop !== null && itemById.has(local.meta.autoStop.itemId);

  const merged: AppData = {
    version: 1,
    groups,
    items,
    order: { habits: orderFor('habits'), tasks: orderFor('tasks') },
    sessions: [...sessions.values()],
    marks: newerByKey(local.marks, incoming.marks, (mark) => `${mark.itemId}|${mark.day}`).filter(
      (mark) => itemById.has(mark.itemId)
    ),
    skips: [...new Set([...local.skips, ...incoming.skips])],
    clocks,
    run: runIsLive ? local.run : null,
    cardItemId:
      local.cardItemId !== null && itemById.has(local.cardItemId) ? local.cardItemId : null,
    settings:
      incoming.settings.updatedAt > local.settings.updatedAt ? incoming.settings : local.settings,
    meta: {
      ...local.meta,
      firstUseAt: Math.min(local.meta.firstUseAt, incoming.meta.firstUseAt),
      lastQuickNumber: mergeLastQuickNumber(
        local.meta.lastQuickNumber,
        incoming.meta.lastQuickNumber
      ),
      autoStop: autoStopIsLive ? local.meta.autoStop : null,
    },
    tombstones,
  };
  return openApp(merged, now);
}

export function replaceData(local: AppData, incoming: AppData, now: number): AppData {
  const opened = openApp(incoming, now);
  return { ...opened, meta: { ...opened.meta, firstUseAt: local.meta.firstUseAt } };
}
