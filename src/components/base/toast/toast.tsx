import {
  useCallback,
  useId,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@/components/base/button/button';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
  XCircleIcon,
  XIcon,
} from '@/components/base/icon';
import { ToastContext, type ToastAction, type ToastOptions, type ToastTone } from './toast-context';
import styles from './toast.module.css';

const DEFAULT_DURATION = 5000;

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  icon: boolean;
  duration: number | null;
  action?: ToastAction;
  leaving: boolean;
  /** The toast needs the reader (it stays or carries an action), so it takes focus when it appears. */
  takesFocus?: boolean;
}

export type ToastPosition =
  'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';

interface ToastProviderProps {
  children: ReactNode;
  /** Where toasts sit. Start and end follow the reading direction. Defaults to `bottom-end`. */
  position?: ToastPosition;
  /**
   * `page` places toasts against the viewport. `container` places them inside the nearest
   * positioned ancestor of the provider's children, for a drawer or panel whose page behind is
   * inert and whose toasts must stay inside it. Defaults to `page`.
   */
  scope?: 'page' | 'container';
}

export function ToastProvider({
  children,
  position = 'bottom-end',
  scope = 'page',
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const regionRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [announcement, setAnnouncement] = useState<{ id: number; message: string } | null>(null);

  // A toast that takes focus reports the focused control just before it does, so the reader can
  // be sent back there. An earlier toast already holding focus leaves the first opener in place.
  const rememberOpener = useCallback(() => {
    if (!regionRef.current?.contains(document.activeElement)) {
      openerRef.current = document.activeElement as HTMLElement | null;
    }
  }, []);

  const dismiss = useCallback((id: number) => {
    // A dismissed toast goes inert and drops focus, so hand it back to where the reader came from.
    const region = regionRef.current;
    const opener = openerRef.current;
    if (region?.contains(document.activeElement) && opener?.isConnected) {
      opener.focus();
    }
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast))
    );
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    setAnnouncement((current) => (current?.id === id ? null : current));
  }, []);

  const showToast = useCallback(
    ({
      message,
      tone = 'neutral',
      icon = true,
      duration = tone === 'danger' || tone === 'warning' ? null : DEFAULT_DURATION,
      action,
    }: ToastOptions) => {
      const id = nextId.current;
      nextId.current += 1;
      const takesFocus = duration === null || Boolean(action);
      if (!takesFocus) {
        setAnnouncement({ id, message });
      }
      setToasts((current) => [
        ...current,
        { id, message, tone, icon, duration, action, leaving: false, takesFocus },
      ]);
      return () => dismiss(id);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* Mounted before any message, so a screen reader announces each short toast as it arrives. */}
      <div role="log" className="sr-only">
        {announcement ? <span key={announcement.id}>{announcement.message}</span> : null}
      </div>
      <section
        ref={regionRef}
        className={styles.region}
        data-position={position}
        data-scope={scope}
        aria-label="Notifications"
      >
        <ol className={styles.list}>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onDismiss={dismiss}
              onExited={remove}
              onTakeFocus={rememberOpener}
            />
          ))}
        </ol>
      </section>
    </ToastContext.Provider>
  );
}

const DIALOG_LABELS: Record<ToastTone, string> = {
  neutral: 'Notification',
  success: 'Success',
  danger: 'Error',
  info: 'Information',
  warning: 'Warning',
};

const TONE_ICONS = {
  success: CheckCircleIcon,
  danger: XCircleIcon,
  info: InfoCircleIcon,
  warning: ExclamationTriangleIcon,
} as const;

export interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: number) => void;
  /** Called when a leaving toast finishes its exit, so the owner can unmount it. */
  onExited?: (id: number) => void;
  /** Called just before a toast that needs the reader takes focus. */
  onTakeFocus?: () => void;
}

/** One toast. The provider renders these; export it so an artboard can show each variant at rest. */
export function Toast({ toast, onDismiss, onExited, onTakeFocus }: ToastProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stacked, setStacked] = useState(false);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLLIElement>(null);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const messageId = useId();
  const labelId = useId();
  const paused = hovered || focused;
  const { action } = toast;
  const ToneIcon = toast.tone === 'neutral' ? null : TONE_ICONS[toast.tone];

  useEffect(() => {
    if (toast.duration === null || paused || toast.leaving) {
      return;
    }
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, toast.leaving, paused, onDismiss]);

  // A toast the reader must act on takes focus once, on the action first and the dismiss button
  // otherwise. Focus also pauses its timer, so an Undo stays until the reader leaves it.
  useEffect(() => {
    if (toast.takesFocus) {
      onTakeFocus?.();
      (actionRef.current ?? dismissRef.current)?.focus();
    }
  }, [toast.takesFocus, onTakeFocus]);

  useEffect(() => {
    const item = itemRef.current;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss(toast.id);
      }
    };
    item?.addEventListener('keydown', dismissOnEscape);
    return () => item?.removeEventListener('keydown', dismissOnEscape);
  }, [toast.id, onDismiss]);

  // The action has wrapped onto its own row when it starts below the message. Stacking only
  // changes block spacing, so the wrap never flips back.
  useLayoutEffect(() => {
    const message = messageRef.current;
    const actionButton = actionRef.current;
    if (!message || !actionButton) {
      return undefined;
    }
    const measure = () =>
      setStacked(actionButton.offsetTop >= message.offsetTop + message.offsetHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(message);
    return () => observer.disconnect();
  }, [action]);

  return (
    <li
      ref={itemRef}
      className={`${styles.item} ${toast.leaving ? styles.leaving : ''}`}
      data-tone={toast.tone}
      inert={toast.leaving}
      onTransitionEnd={(event) => {
        if (
          toast.leaving &&
          event.target === event.currentTarget &&
          event.propertyName === 'opacity'
        ) {
          onExited?.(toast.id);
        }
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      }}
    >
      <div className={styles.clip}>
        <div
          className={`${styles.toast} ${styles[toast.tone]}`}
          data-stacked={stacked || undefined}
          role={toast.takesFocus ? 'alertdialog' : undefined}
          aria-labelledby={toast.takesFocus ? labelId : undefined}
          aria-describedby={toast.takesFocus ? messageId : undefined}
        >
          {toast.takesFocus ? (
            <span id={labelId} className="sr-only">
              {DIALOG_LABELS[toast.tone]}
            </span>
          ) : null}
          {ToneIcon && toast.icon ? <ToneIcon className={styles.icon} /> : null}
          <div className={styles.body}>
            <p id={messageId} ref={messageRef} className={styles.message}>
              {toast.message}
            </p>
            {action ? (
              <Button
                ref={actionRef}
                variant="ghost"
                size="sm"
                className={styles.action}
                onClick={() => {
                  action.onAction();
                  onDismiss(toast.id);
                }}
              >
                {action.label}
              </Button>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={XIcon}
            className={styles.dismiss}
            ref={dismissRef}
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
          />
        </div>
      </div>
    </li>
  );
}
