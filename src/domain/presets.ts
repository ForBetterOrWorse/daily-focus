import { goalText } from './goal-text';
import type { ItemInput } from './items';
import type { TimerStyle } from './types';

interface PresetBase {
  name: string;
}

type Preset = PresetBase &
  (
    | { completion: 'check'; target?: never; timerStyle?: never }
    | { completion: 'count'; target: number; timerStyle?: never }
    | { completion: 'time'; target: number; timerStyle?: TimerStyle }
  );

export const HABIT_PRESETS = [
  { name: 'Drink water', completion: 'count', target: 8 },
  { name: 'Read', completion: 'time', target: 30, timerStyle: 'free' },
  { name: 'Study', completion: 'time', target: 50, timerStyle: 'sessions' },
  { name: 'Meditate', completion: 'time', target: 10, timerStyle: 'free' },
  { name: 'Walk', completion: 'check' },
  { name: 'Journal', completion: 'check' },
] as const satisfies readonly Preset[];

export const TASK_PRESETS = [
  { name: 'Plan the week', completion: 'check' },
  { name: 'Reply to emails', completion: 'check' },
  {
    name: 'Focused work',
    completion: 'time',
    target: 50,
    timerStyle: 'sessions',
  },
  {
    name: 'Prepare a presentation',
    completion: 'time',
    target: 25,
    timerStyle: 'sessions',
  },
] as const satisfies readonly Preset[];

export function presetInput(preset: Preset): ItemInput {
  const kind: ItemInput['kind'] = HABIT_PRESETS.some((habitPreset) => habitPreset === preset)
    ? 'habit'
    : 'task';
  const base = { name: preset.name, kind };

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
