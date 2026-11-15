import { afterEach, describe, expect, it, vi } from 'vitest';
import { withViewTransition } from './view-transition';

describe('withViewTransition', () => {
  afterEach(() => {
    Reflect.deleteProperty(document, 'startViewTransition');
  });

  it('should run the update directly when the View Transition API is missing', () => {
    const update = vi.fn();

    withViewTransition(update);

    expect(update).toHaveBeenCalledOnce();
  });
});
