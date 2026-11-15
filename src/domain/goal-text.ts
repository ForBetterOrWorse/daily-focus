import type { Completion, TimerStyle } from './types';

const FOCUS_SESSION_MINUTES = 25;

interface GoalTextInput {
  completion: Completion;
  timerStyle?: TimerStyle;
  target?: number;
}

export function goalText({ completion, timerStyle, target }: GoalTextInput): string | undefined {
  if (completion === 'check' || target === undefined) {
    return undefined;
  }

  if (completion === 'count') {
    return target === 1 ? '1 time' : `${target} times`;
  }

  if (timerStyle === 'sessions' && target % FOCUS_SESSION_MINUTES === 0) {
    const sessions = target / FOCUS_SESSION_MINUTES;
    return `${sessions} ${sessions === 1 ? 'session' : 'sessions'}`;
  }

  return `${target} min`;
}
