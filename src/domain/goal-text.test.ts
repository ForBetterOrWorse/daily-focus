import { describe, expect, it } from 'vitest';
import { goalText } from './goal-text';

describe('goal text', () => {
  it('should express whole Focus session goals in sessions', () => {
    expect(goalText({ completion: 'time', timerStyle: 'sessions', target: 50 })).toBe('2 sessions');
  });

  it('should express one Focus session goal in singular', () => {
    expect(goalText({ completion: 'time', timerStyle: 'sessions', target: 25 })).toBe('1 session');
  });

  it('should keep partial Focus session goals in minutes', () => {
    expect(goalText({ completion: 'time', timerStyle: 'sessions', target: 30 })).toBe('30 min');
  });

  it('should express Free run time goals in minutes', () => {
    expect(goalText({ completion: 'time', timerStyle: 'free', target: 30 })).toBe('30 min');
  });

  it('should express count goals in times', () => {
    expect(goalText({ completion: 'count', target: 8 })).toBe('8 times');
    expect(goalText({ completion: 'count', target: 1 })).toBe('1 time');
  });

  it('should not show text for check goals', () => {
    expect(goalText({ completion: 'check' })).toBeUndefined();
  });
});
