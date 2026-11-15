import { describe, expect, it } from 'vitest';
import { countLabel } from './count-label';

describe('countLabel', () => {
  it('should use the singular noun for one', () => {
    expect(countLabel(1, 'item')).toBe('1 item');
  });

  it('should use the plural noun for more than one', () => {
    expect(countLabel(3, 'session')).toBe('3 sessions');
  });

  it('should use the plural noun for zero', () => {
    expect(countLabel(0, 'item')).toBe('0 items');
  });
});
