import type { AppData } from './types';

export function addGroup(data: AppData, name: string, now: number): AppData {
  return {
    ...data,
    groups: [...data.groups, { id: crypto.randomUUID(), name: name.trim(), updatedAt: now }],
  };
}

export function renameGroup(data: AppData, groupId: string, name: string, now: number): AppData {
  return {
    ...data,
    groups: data.groups.map((group) =>
      group.id === groupId ? { ...group, name: name.trim(), updatedAt: now } : group
    ),
  };
}

export function removeGroup(data: AppData, groupId: string, now: number): AppData {
  return {
    ...data,
    groups: data.groups.filter((group) => group.id !== groupId),
    items: data.items.map((item) =>
      item.groupId === groupId ? { ...item, groupId: null, updatedAt: now } : item
    ),
    tombstones: { ...data.tombstones, [groupId]: now },
  };
}

export function groupNameError(data: AppData, name: string, exceptId?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Enter a group name';
  }
  const existing = data.groups.find(
    (group) => group.id !== exceptId && group.name.toLowerCase() === trimmed.toLowerCase()
  );
  return existing ? `You already have a ${existing.name} group` : null;
}
