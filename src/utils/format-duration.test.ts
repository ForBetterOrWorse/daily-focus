import { describe, expect, it } from 'vitest';
import { formatDuration } from './format-duration';

describe('formatDuration', () => {
  it('should format zero minutes', () => {
    expect(formatDuration(0)).toBe('0 min');
  });

  it('should format under an hour in minutes', () => {
    expect(formatDuration(25)).toBe('25 min');
  });

  it('should format exact hours without minutes', () => {
    expect(formatDuration(120)).toBe('2 h');
  });

  it('should format hours and minutes', () => {
    expect(formatDuration(95)).toBe('1 h 35 min');
  });

  it('should round fractional minutes', () => {
    expect(formatDuration(59.6)).toBe('1 h');
  });
});
