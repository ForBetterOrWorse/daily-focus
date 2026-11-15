import { goalText } from './goal-text';
import type { ItemInput } from './items';
import type { Group, TimerStyle } from './types';

interface PresetBase {
  name: string;
  groupName: string;
}

type Preset = PresetBase &
  (
    | { completion: 'check'; target?: never; timerStyle?: never }
    | { completion: 'count'; target: number; timerStyle?: never }
    | { completion: 'time'; target: number; timerStyle?: TimerStyle }
  );

export const HABIT_PRESETS = [
  { name: 'Drink water', groupName: 'Health', completion: 'count', target: 8 },
  { name: 'Read', groupName: 'Learning', completion: 'time', target: 30, timerStyle: 'free' },
  { name: 'Study', groupName: 'Learning', completion: 'time', target: 50, timerStyle: 'sessions' },
  { name: 'Meditate', groupName: 'Health', completion: 'time', target: 10, timerStyle: 'free' },
  { name: 'Walk', groupName: 'Health', completion: 'check' },
  { name: 'Journal', groupName: 'Hobby', completion: 'check' },
] as const satisfies readonly Preset[];

export const TASK_PRESETS = [
  { name: 'Plan the week', groupName: 'Work', completion: 'check' },
  { name: 'Reply to emails', groupName: 'Work', completion: 'check' },
  {
    name: 'Write a draft',
    groupName: 'Work',
    completion: 'time',
    target: 50,
    timerStyle: 'sessions',
  },
  {
    name: 'Study for exam',
    groupName: 'Learning',
    completion: 'time',
    target: 50,
    timerStyle: 'sessions',
  },
] as const satisfies readonly Preset[];

export function presetInput(preset: Preset, groups: readonly Group[]): ItemInput {
  const kind: ItemInput['kind'] = HABIT_PRESETS.some((habitPreset) => habitPreset === preset)
    ? 'habit'
    : 'task';
  const groupId = groups.find((group) => group.name === preset.groupName)?.id ?? null;
  const base = { name: preset.name, groupId, kind };

  if (preset.completion === 'check') {
    return { ...base, completion: 'check' };
  }
  if (preset.completion === 'count') {
    return { ...base, completion: 'count', target: preset.target };
  }
  return {
    ...base,
    completion: 'time',
    target: preset.target,
    ...(preset.timerStyle === undefined ? {} : { timerStyle: preset.timerStyle }),
  };
}

export function presetLabel(preset: Preset): string {
  const goal = goalText(preset);
  return goal === undefined ? preset.name : `${preset.name} ${goal}`;
}
