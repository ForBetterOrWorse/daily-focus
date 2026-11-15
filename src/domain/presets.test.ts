import { describe, expect, it } from 'vitest';
import { HABIT_PRESETS, presetInput, presetLabel, TASK_PRESETS } from './presets';
import type { Group } from './types';

const groups: Group[] = [
  { id: 'work', name: 'Work', updatedAt: 0 },
  { id: 'health', name: 'Health', updatedAt: 0 },
  { id: 'learning', name: 'Learning', updatedAt: 0 },
  { id: 'chores', name: 'Chores', updatedAt: 0 },
  { id: 'hobby', name: 'Hobby', updatedAt: 0 },
];

describe('habit presets', () => {
  it('should match each habit preset to its configured group and goal', () => {
    expect(HABIT_PRESETS.map((preset) => presetInput(preset, groups))).toEqual([
      { name: 'Drink water', groupId: 'health', kind: 'habit', completion: 'count', target: 8 },
      {
        name: 'Read',
        groupId: 'learning',
        kind: 'habit',
        completion: 'time',
        target: 30,
        timerStyle: 'free',
      },
      {
        name: 'Study',
        groupId: 'learning',
        kind: 'habit',
        completion: 'time',
        target: 50,
        timerStyle: 'sessions',
      },
      {
        name: 'Meditate',
        groupId: 'health',
        kind: 'habit',
        completion: 'time',
        target: 10,
        timerStyle: 'free',
      },
      { name: 'Walk', groupId: 'health', kind: 'habit', completion: 'check' },
      { name: 'Journal', groupId: 'hobby', kind: 'habit', completion: 'check' },
    ]);
  });

  it('should leave a preset ungrouped when its group is missing or renamed', () => {
    expect(
      presetInput(
        HABIT_PRESETS[0],
        groups.filter((group) => group.name !== 'Health')
      ).groupId
    ).toBeNull();
    expect(
      presetInput(HABIT_PRESETS[0], [
        ...groups.filter((group) => group.name !== 'Health'),
        { id: 'wellness', name: 'Wellness', updatedAt: 0 },
      ]).groupId
    ).toBeNull();
  });
});

describe('task presets', () => {
  it('should match each task preset to its configured group and goal', () => {
    expect(TASK_PRESETS.map((preset) => presetInput(preset, groups))).toEqual([
      { name: 'Plan the week', groupId: 'work', kind: 'task', completion: 'check' },
      { name: 'Reply to emails', groupId: 'work', kind: 'task', completion: 'check' },
      {
        name: 'Write a draft',
        groupId: 'work',
        kind: 'task',
        completion: 'time',
        target: 50,
        timerStyle: 'sessions',
      },
      {
        name: 'Study for exam',
        groupId: 'learning',
        kind: 'task',
        completion: 'time',
        target: 50,
        timerStyle: 'sessions',
      },
    ]);
  });
});

describe('preset labels', () => {
  it('should include the goal text when a preset has a goal', () => {
    expect(HABIT_PRESETS.slice(0, 4).map(presetLabel)).toEqual([
      'Drink water 8 times',
      'Read 30 min',
      'Study 2 sessions',
      'Meditate 10 min',
    ]);
  });

  it('should show just the name when a preset has no goal', () => {
    expect(
      [HABIT_PRESETS[4], HABIT_PRESETS[5], ...TASK_PRESETS.slice(0, 2)].map(presetLabel)
    ).toEqual(['Walk', 'Journal', 'Plan the week', 'Reply to emails']);
  });
});
