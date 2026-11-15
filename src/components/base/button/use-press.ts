import { useEffect, useRef, useState } from 'react';
import type { FocusEvent, FocusEventHandler, KeyboardEvent, KeyboardEventHandler } from 'react';

export function usePress<T extends HTMLElement>(options: {
  disabled?: boolean;
  spaceActivates: boolean;
  onKeyDown?: KeyboardEventHandler<T>;
  onKeyUp?: KeyboardEventHandler<T>;
  onBlur?: FocusEventHandler<T>;
}): {
  pressed: boolean;
  handlers: {
    onKeyDown: KeyboardEventHandler<T>;
    onKeyUp: KeyboardEventHandler<T>;
    onBlur: FocusEventHandler<T>;
  };
} {
  const { disabled = false, spaceActivates, onKeyDown, onKeyUp, onBlur } = options;
  const [pressed, setPressed] = useState(false);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearEnterTimer() {
    if (enterTimer.current !== null) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
  }

  function release() {
    clearEnterTimer();
    setPressed(false);
  }

  // A control disabled mid-press may never get its keyup or blur. Inlined, since the effect may only depend on disabled.
  useEffect(() => {
    if (disabled) {
      if (enterTimer.current !== null) {
        clearTimeout(enterTimer.current);
        enterTimer.current = null;
      }
      setPressed(false);
    }
  }, [disabled]);

  useEffect(
    () => () => {
      clearEnterTimer();
    },
    []
  );

  const handlers = {
    onKeyDown(event: KeyboardEvent<T>) {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.repeat || disabled) {
        return;
      }

      if (event.key === 'Enter') {
        clearEnterTimer();
        setPressed(true);
        enterTimer.current = setTimeout(() => {
          enterTimer.current = null;
          setPressed(false);
        }, 100);
      } else if (spaceActivates && event.key === ' ') {
        clearEnterTimer();
        setPressed(true);
      }
    },
    onKeyUp(event: KeyboardEvent<T>) {
      onKeyUp?.(event);
      if (spaceActivates && event.key === ' ') {
        release();
      }
    },
    onBlur(event: FocusEvent<T>) {
      onBlur?.(event);
      release();
    },
  };

  return { pressed, handlers };
}
