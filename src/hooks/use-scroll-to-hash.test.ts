import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { useScrollToHash } from './use-scroll-to-hash';

const scrollIntoView = vi.fn();

function addTarget(id: string): HTMLElement {
  const el = document.createElement('section');
  el.id = id;
  el.tabIndex = -1;
  document.body.appendChild(el);
  return el;
}

function renderAt(path: string) {
  const { hook } = memoryLocation({ path });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(Router, { hook, children });
  return renderHook(() => useScrollToHash(), { wrapper });
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: reduce,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
  stubReducedMotion(false);
});

afterEach(() => {
  scrollIntoView.mockClear();
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
});

describe('useScrollToHash', () => {
  it('should scroll to and focus the hash target after rendering', () => {
    const target = addTarget('stats-activity');
    window.history.replaceState(null, '', '/stats#stats-activity');

    renderAt('/stats');

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(target).toHaveFocus();
  });

  it('should do nothing when the target is missing', () => {
    window.history.replaceState(null, '', '/stats#nope');
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    expect(() => renderAt('/stats')).not.toThrow();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('should do nothing when there is no hash', () => {
    addTarget('stats-activity');

    renderAt('/stats');

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('should find a target that mounts on the next frame', () => {
    window.history.replaceState(null, '', '/stats#stats-activity');
    let frame: FrameRequestCallback = () => {};
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frame = cb;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});

    renderAt('/stats');
    const target = addTarget('stats-activity');
    act(() => {
      frame(0);
    });

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(target).toHaveFocus();
  });

  it('should scroll instantly under reduced motion', () => {
    stubReducedMotion(true);
    addTarget('stats-activity');
    window.history.replaceState(null, '', '/stats#stats-activity');

    renderAt('/stats');

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('should scroll again when the hash changes on the same page', () => {
    addTarget('settings-backup');
    const alerts = addTarget('settings-alerts');
    window.history.replaceState(null, '', '/settings#settings-backup');
    renderAt('/settings');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    act(() => {
      window.history.replaceState(null, '', '/settings#settings-alerts');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(alerts).toHaveFocus();
  });
});
