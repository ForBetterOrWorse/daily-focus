import { describe, expect, it } from 'vitest';
import { formatClock } from './format-clock';

describe('formatClock', () => {
  it('should format zero seconds', () => {
    expect(formatClock(0)).toBe('0:00');
  });

  it('should pad seconds under a minute', () => {
    expect(formatClock(5)).toBe('0:05');
  });

  it('should format minutes and seconds', () => {
    expect(formatClock(25 * 60)).toBe('25:00');
    expect(formatClock(24 * 60 + 59)).toBe('24:59');
  });

  it('should format hours with padded minutes', () => {
    expect(formatClock(3600 + 5 * 60 + 22)).toBe('1:05:22');
  });
});
