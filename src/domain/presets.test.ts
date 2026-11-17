import { describe, expect, it } from 'vitest';
import { HABIT_PRESETS, presetInput, presetLabel, TASK_PRESETS } from './presets';

describe('habit presets', () => {
  it('should create standalone items with their configured goals', () => {
    expect(HABIT_PRESETS.map((preset) => presetInput(preset))).toEqual([
      { name: 'Drink water', kind: 'habit', completion: 'count', target: 8 },
      {
        name: 'Read',
        kind: 'habit',
        completion: 'time',
        target: 30,
        timerStyle: 'free',
      },
      {
        name: 'Study',
        kind: 'habit',
        completion: 'time',
        target: 50,
        timerStyle: 'sessions',
      },
      {
        name: 'Meditate',
        kind: 'habit',
        completion: 'time',
        target: 10,
        timerStyle: 'free',
      },
      { name: 'Walk', kind: 'habit', completion: 'check' },
      { name: 'Journal', kind: 'habit', completion: 'check' },
    ]);
  });
});

describe('task presets', () => {
  it('should create standalone items with their configured goals', () => {
    expect(TASK_PRESETS.map((preset) => presetInput(preset))).toEqual([
      { name: 'Plan the week', kind: 'task', completion: 'check' },
      { name: 'Reply to emails', kind: 'task', completion: 'check' },
      {
        name: 'Focused work',
        kind: 'task',
        completion: 'time',
        target: 50,
        timerStyle: 'sessions',
      },
      {
        name: 'Prepare a presentation',
        kind: 'task',
        completion: 'time',
        target: 25,
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

  it('should label the presentation task as one session', () => {
    expect(presetLabel(TASK_PRESETS[3])).toBe('Prepare a presentation 1 session');
  });
});
