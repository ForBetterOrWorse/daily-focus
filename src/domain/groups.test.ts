import { describe, expect, it } from 'vitest';
import { emptyData } from './schema';
import { addGroup, groupNameError, removeGroup, renameGroup } from './groups';
import type { AppData, TaskItem } from './types';

const now = new Date(2024, 0, 3, 9).getTime();
const later = now + 60_000;

function task(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'read',
    name: 'Read',
    kind: 'task',
    groupId: null,
    completion: 'check',
    goals: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function dataWithWork(): AppData {
  return {
    ...emptyData(now),
    groups: [{ id: 'work', name: 'Work', updatedAt: now }],
    items: [task({ id: 'a', groupId: 'work' }), task({ id: 'b', groupId: null })],
  };
}

describe('addGroup', () => {
  it('should append a trimmed group with a fresh id and updatedAt', () => {
    const data = dataWithWork();
    const next = addGroup(data, '  Home  ', later);

    expect(next.groups).toHaveLength(2);
    expect(next.groups[1]).toEqual({ id: expect.any(String), name: 'Home', updatedAt: later });
    expect(next.groups[1].id).not.toBe('work');
    expect(data.groups).toHaveLength(1);
  });
});

describe('renameGroup', () => {
  it('should set the trimmed name and updatedAt on that group only', () => {
    const data = addGroup(dataWithWork(), 'Home', now);
    const next = renameGroup(data, 'work', '  Job ', later);

    expect(next.groups[0]).toEqual({ id: 'work', name: 'Job', updatedAt: later });
    expect(next.groups[1]).toEqual(data.groups[1]);
  });
});

describe('removeGroup', () => {
  it('should remove the group, tombstone it, and ungroup its items', () => {
    const next = removeGroup(dataWithWork(), 'work', later);

    expect(next.groups).toEqual([]);
    expect(next.tombstones.work).toBe(later);
    expect(next.items.find((item) => item.id === 'a')).toMatchObject({
      groupId: null,
      updatedAt: later,
    });
    expect(next.items.find((item) => item.id === 'b')?.updatedAt).toBe(now);
  });

  it('should not mutate its input so the earlier data restores the group and items', () => {
    const before = dataWithWork();
    const snapshot = structuredClone(before);
    const removed = removeGroup(before, 'work', later);

    expect(removed).not.toEqual(before);
    expect(before).toEqual(snapshot);
    expect(before.groups).toHaveLength(1);
    expect(before.items[0].groupId).toBe('work');
    expect(before.tombstones.work).toBeUndefined();
  });
});

describe('groupNameError', () => {
  it('should reject an empty or blank name', () => {
    expect(groupNameError(dataWithWork(), '   ')).toBe('Enter a group name');
  });

  it('should reject a case-insensitive duplicate using the existing name', () => {
    expect(groupNameError(dataWithWork(), ' wORK ')).toBe('You already have a Work group');
  });

  it('should allow the group being renamed to keep its own name', () => {
    expect(groupNameError(dataWithWork(), 'work', 'work')).toBeNull();
  });

  it('should accept a new name', () => {
    expect(groupNameError(dataWithWork(), 'Home')).toBeNull();
  });
});
