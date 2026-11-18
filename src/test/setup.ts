import '@testing-library/jest-dom';

// jsdom has no AnimationEvent. React checks for it when it loads and otherwise listens for the
// prefixed webkitAnimationEnd, so fireEvent.animationEnd would never reach an onAnimationEnd handler.
Object.defineProperty(window, 'AnimationEvent', {
  configurable: true,
  writable: true,
  value: class AnimationEvent extends Event {},
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: /min-width/.test(query),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
});

Object.defineProperty(window, 'IntersectionObserver', {
  configurable: true,
  writable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds: ReadonlyArray<number> = [];
  },
});

// Tests advance fake timers by minutes or hours. A frame loop would run hundreds of thousands of
// frames over that span, so animation frames never fire. A test that needs them stubs them itself.
Object.defineProperty(window, 'requestAnimationFrame', {
  configurable: true,
  writable: true,
  value: () => 0,
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  configurable: true,
  writable: true,
  value: () => {},
});
