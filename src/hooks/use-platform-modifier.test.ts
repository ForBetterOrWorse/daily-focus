import { afterEach, describe, expect, it } from 'vitest';
import { getAltLabel, getCmdLabel } from './use-platform-modifier';

const originalPlatform = navigator.platform;

afterEach(() => {
  Object.defineProperty(navigator, 'platform', {
    configurable: true,
    value: originalPlatform,
  });
});

describe('getCmdLabel', () => {
  it('should return ⌘ on macOS', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });

    expect(getCmdLabel()).toBe('⌘');
  });

  it('should return Ctrl on non-Apple platforms', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'Linux x86_64',
    });

    expect(getCmdLabel()).toBe('Ctrl');
  });

  it('should return ⌘ on iPhone', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'iPhone',
    });

    expect(getCmdLabel()).toBe('⌘');
  });
});

describe('getAltLabel', () => {
  it('should return ⌥ on macOS', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });

    expect(getAltLabel()).toBe('⌥');
  });

  it('should return Alt on non-Apple platforms', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'Linux x86_64',
    });

    expect(getAltLabel()).toBe('Alt');
  });

  it('should return ⌥ on iPhone', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'iPhone',
    });

    expect(getAltLabel()).toBe('⌥');
  });
});
