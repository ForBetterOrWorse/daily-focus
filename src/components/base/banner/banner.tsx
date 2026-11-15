import { useEffect, useState, type ReactNode } from 'react';
import { XIcon } from '@/components/base/icon';
import styles from './banner.module.css';

interface Props {
  children: ReactNode;
  dismissible?: boolean;
  /** Called after the exit animation ends, so the owner can unmount the banner. */
  onDismiss?: () => void;
  ariaLabel?: string;
  /**
   * Announce the message to screen readers. Set it on a banner that appears after the page has
   * loaded, such as one a timer or an action raises. Leave it off for a banner that is part of the
   * page from the start, which a screen reader finds in place.
   */
  announce?: boolean;
}

export function Banner({
  children,
  dismissible = true,
  onDismiss,
  ariaLabel = 'Notice',
  announce = false,
}: Props) {
  const [leaving, setLeaving] = useState(false);
  // A live region announces content added after it mounts, so an announced banner mounts its
  // message empty and fills it in on the next effect.
  const [filled, setFilled] = useState(!announce);

  useEffect(() => {
    setFilled(true);
  }, []);

  return (
    <aside
      className={`${styles.root} ${leaving ? styles.leaving : ''}`}
      aria-label={ariaLabel}
      inert={leaving}
      onTransitionEnd={(event) => {
        if (leaving && event.target === event.currentTarget && event.propertyName === 'opacity') {
          onDismiss?.();
        }
      }}
    >
      <div className={styles.clip}>
        <div className={styles.banner}>
          <p className={styles.content} role={announce ? 'status' : undefined}>
            {filled ? children : null}
          </p>
          {dismissible && (
            <button
              type="button"
              className={styles.dismiss}
              aria-label="Dismiss"
              onClick={() => {
                if (onDismiss) {
                  setLeaving(true);
                }
              }}
            >
              <XIcon />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
