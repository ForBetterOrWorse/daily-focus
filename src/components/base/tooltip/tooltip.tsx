import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type Ref,
  type TransitionEvent,
} from 'react';
import { KbdCombo } from '@/components/base/kbd-combo/kbd-combo';
import { lastInputWasKeyboard, trackInputModality } from './input-modality';
import { placeTooltip, type TooltipAlign, type TooltipSide } from './place-tooltip';
import styles from './tooltip.module.css';

/** A tooltip that opens within this window of another one closing skips its hover delay. */
const SKIP_DELAY_WINDOW_MS = 300;

let lastClosedAt = -Infinity;
let activeClose: (() => void) | null = null;

interface TriggerProps {
  ref?: Ref<HTMLElement>;
  'aria-label'?: string;
  'aria-describedby'?: string;
  onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
}

export interface TooltipProps {
  /** The one element the tooltip describes. It must accept `ref` and spread its props onto a DOM element. */
  children: ReactElement<TriggerProps>;
  /** Plain text. An empty string shows no tooltip. */
  label: string;
  /** Optional keyboard shortcut displayed alongside the label. */
  shortcut?: string[];
  side?: TooltipSide;
  align?: TooltipAlign;
  /** Milliseconds before a hover opens the tooltip. Keyboard focus opens it at once. */
  delay?: number;
  /** Milliseconds before leaving the trigger closes the tooltip. */
  closeDelay?: number;
  /** Controls the tooltip. Leave it out to let hover and focus decide. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

function hasTransition(element: HTMLElement) {
  return getComputedStyle(element)
    .transitionDuration.split(',')
    .some((duration) => parseFloat(duration) > 0);
}

export function Tooltip({
  children,
  label,
  shortcut,
  side = 'top',
  align = 'center',
  delay = 100,
  closeDelay = 100,
  open: openProp,
  onOpenChange,
  disabled = false,
  id,
  className,
}: TooltipProps) {
  const generatedId = useId();
  const tooltipId = id ?? generatedId;
  const isControlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const enabled = !disabled && label !== '';
  const requestedOpen = isControlled ? openProp : uncontrolledOpen;
  const open = requestedOpen && enabled;
  const [present, setPresent] = useState(open);
  if (open && !present) {
    setPresent(true);
  }

  const triggerRef = useRef<HTMLElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldByFocus = useRef(false);
  const hideRef = useRef<() => void>(() => {});
  const closeSelf = useCallback(() => hideRef.current(), []);

  const childProps = children.props;
  const childRef = childProps.ref;
  const setTriggerRef = useCallback(
    (element: HTMLElement | null) => {
      triggerRef.current = element;
      if (typeof childRef === 'function') {
        childRef(element);
      } else if (childRef) {
        childRef.current = element;
      }
    },
    [childRef]
  );

  function clearTimers() {
    if (openTimer.current !== null) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function changeOpen(next: boolean) {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    if (next !== requestedOpen) {
      onOpenChange?.(next);
    }
  }

  function show() {
    clearTimers();
    if (activeClose && activeClose !== closeSelf) {
      activeClose();
    }
    activeClose = closeSelf;
    changeOpen(true);
  }

  function hide() {
    clearTimers();
    heldByFocus.current = false;
    if (!requestedOpen) {
      return;
    }
    lastClosedAt = Date.now();
    if (activeClose === closeSelf) {
      activeClose = null;
    }
    changeOpen(false);
  }

  function scheduleHide() {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
    }
    if (closeDelay === 0) {
      hide();
      return;
    }
    closeTimer.current = setTimeout(hide, closeDelay);
  }

  useEffect(() => {
    hideRef.current = hide;
  });

  useEffect(() => {
    trackInputModality();
    return () => {
      clearTimers();
      if (activeClose === closeSelf) {
        activeClose = null;
      }
    };
  }, [closeSelf]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        hideRef.current();
      }
    }
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open]);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const popup = popupRef.current;
    if (!trigger || !popup) {
      return;
    }
    const placement = placeTooltip({
      trigger: trigger.getBoundingClientRect(),
      popup: popup.getBoundingClientRect(),
      viewport: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      },
      side,
      align,
      rtl: getComputedStyle(trigger).direction === 'rtl',
    });
    popup.style.setProperty('--tooltip-x', `${placement.x}px`);
    popup.style.setProperty('--tooltip-y', `${placement.y}px`);
    popup.dataset.side = placement.side;
  }, [side, align]);

  useLayoutEffect(() => {
    if (present) {
      place();
    }
  }, [present, place, label, shortcut]);

  useEffect(() => {
    if (!present) {
      return;
    }
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [present, place]);

  useEffect(() => {
    if (open || !present) {
      return;
    }
    const popup = popupRef.current;
    if (!popup || !hasTransition(popup)) {
      setPresent(false);
    }
  }, [open, present]);

  const popupRefCallback = useCallback((element: HTMLDivElement | null) => {
    popupRef.current = element;
    element?.showPopover?.();
  }, []);

  function handlePointerEnter(event: PointerEvent<HTMLElement>) {
    childProps.onPointerEnter?.(event);
    if (event.pointerType === 'touch' || !enabled) {
      return;
    }
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (requestedOpen) {
      return;
    }
    const warm =
      (activeClose !== null && activeClose !== closeSelf) ||
      Date.now() - lastClosedAt < SKIP_DELAY_WINDOW_MS;
    if (warm || delay === 0) {
      show();
      return;
    }
    openTimer.current = setTimeout(show, delay);
  }

  function handlePointerLeave(event: PointerEvent<HTMLElement>) {
    childProps.onPointerLeave?.(event);
    if (event.pointerType === 'touch') {
      return;
    }
    if (openTimer.current !== null) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (requestedOpen && !heldByFocus.current) {
      scheduleHide();
    }
  }

  function handleFocus(event: FocusEvent<HTMLElement>) {
    childProps.onFocus?.(event);
    if (!enabled || !lastInputWasKeyboard()) {
      return;
    }
    heldByFocus.current = true;
    show();
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    childProps.onBlur?.(event);
    hide();
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    childProps.onPointerDown?.(event);
    hide();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    childProps.onKeyDown?.(event);
    if (event.key === 'Enter' || event.key === ' ') {
      hide();
    }
  }

  function handleTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (!open && event.target === event.currentTarget && event.propertyName === 'opacity') {
      setPresent(false);
    }
  }

  const repeatsName = childProps['aria-label']?.trim() === label.trim();
  const describedBy =
    [childProps['aria-describedby'], present && !repeatsName ? tooltipId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <>
      {cloneElement(children, {
        ref: setTriggerRef,
        'aria-describedby': describedBy,
        onPointerEnter: handlePointerEnter,
        onPointerLeave: handlePointerLeave,
        onPointerDown: handlePointerDown,
        onFocus: handleFocus,
        onBlur: handleBlur,
        onKeyDown: handleKeyDown,
      })}
      {present && enabled ? (
        <div
          ref={popupRefCallback}
          id={tooltipId}
          role="tooltip"
          popover="manual"
          data-state={open ? 'open' : 'closed'}
          data-side={side}
          className={[styles.tooltip, className].filter(Boolean).join(' ')}
          onPointerEnter={() => {
            if (closeTimer.current !== null) {
              clearTimeout(closeTimer.current);
              closeTimer.current = null;
            }
          }}
          onPointerLeave={() => {
            if (!heldByFocus.current) {
              scheduleHide();
            }
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {label}
          {shortcut?.length ? (
            <span className={styles.shortcut} aria-hidden="true">
              <KbdCombo keys={shortcut} minimal />
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
