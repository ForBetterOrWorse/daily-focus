import { useEffect, useRef } from 'react';

export interface Shortcut {
  key: string;
  shift?: boolean;
}

export interface UseShortcutOptions {
  enabled?: boolean;
}

const EDITABLE_OR_DIALOG_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable]',
  '[role="combobox"]',
  '[role="textbox"]',
  '[role="dialog"]',
  'dialog[open]',
  '[aria-modal="true"]',
].join(', ');

export function useShortcut(
  shortcut: Shortcut,
  handler: (event: KeyboardEvent) => void,
  options: UseShortcutOptions = {}
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const { key, shift = false } = shortcut;
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey !== shift ||
        event.key.toLowerCase() !== key.toLowerCase()
      ) {
        return;
      }

      const target = event.target;
      if (target instanceof Element && target.closest(EDITABLE_OR_DIALOG_SELECTOR)) {
        return;
      }

      handlerRef.current(event);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, key, shift]);
}
