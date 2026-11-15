import { describe, expect, it } from 'vitest';
import { findTypeaheadMatch } from './typeahead';

const items = [
  { label: 'english' },
  { label: 'spanish' },
  { label: 'swahili', disabled: true },
  { label: 'swedish' },
  { label: 'Écossais' },
];

describe('findTypeaheadMatch', () => {
  it('should find the first match when nothing is highlighted', () => {
    expect(findTypeaheadMatch(items, -1, 's')).toBe(1);
  });

  it('should move past the current item and skip disabled items on a single letter', () => {
    expect(findTypeaheadMatch(items, 1, 's')).toBe(3);
  });

  it('should wrap around to the start', () => {
    expect(findTypeaheadMatch(items, 3, 's')).toBe(1);
  });

  it('should cycle when the same letter is typed repeatedly', () => {
    expect(findTypeaheadMatch(items, 1, 'ss')).toBe(3);
  });

  it('should keep the current item when a longer query still matches it', () => {
    expect(findTypeaheadMatch(items, 3, 'swe')).toBe(3);
  });

  it('should ignore case and accents', () => {
    expect(findTypeaheadMatch(items, -1, 'eco')).toBe(4);
  });

  it('should return null when nothing matches', () => {
    expect(findTypeaheadMatch(items, -1, 'z')).toBeNull();
  });
});
