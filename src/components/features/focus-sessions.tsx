import { useId } from 'react';
import styles from './focus-sessions.module.css';

// eslint-disable-next-line react-refresh/only-export-components -- the round count belongs with the row it sizes.
export const FOCUS_ROUNDS = 4;

/** A leaf in a 16 by 16 box, pointing up and to the end. */
const LEAF_PATH = 'M2.5 13.5C2 8 5.5 3 13.5 2.5C14 10.5 9 14 2.5 13.5Z';
const PILL_WIDTH = 24;
const PILL_HEIGHT = 8;

type Phase = 'focus' | 'break';
type Status = 'done' | 'current' | 'upcoming';

interface FocusSessionsProps {
  /** The current round, from 1 to `FOCUS_ROUNDS`. */
  round: number;
  phase: Phase;
  /** How far the current session has run, from 0 to 1. */
  progress: number;
  /** Whether the row shows. A closed row stays mounted so it can collapse and spring back. */
  open?: boolean;
}

/** Where the session at `index` (0-based) of `kind` stands while `round` is in `phase`. */
function sessionStatus(index: number, kind: Phase, round: number, phase: Phase): Status {
  const position = index * 2 + (kind === 'break' ? 1 : 0);
  const current = (round - 1) * 2 + (phase === 'break' ? 1 : 0);
  if (position < current) {
    return 'done';
  }
  return position === current ? 'current' : 'upcoming';
}

function describeSession(round: number, phase: Phase): string {
  if (phase === 'focus') {
    return `Focus ${round} of ${FOCUS_ROUNDS}`;
  }
  return round === FOCUS_ROUNDS ? 'Long break' : `Break after focus ${round} of ${FOCUS_ROUNDS}`;
}

/**
 * The focus timer's plan as a row: a pill per focus session and a leaf per break, with a larger
 * leaf for the long break after the last round. Done sessions fill; the current one fills as it runs.
 */
export function FocusSessions({ round, phase, progress, open = true }: FocusSessionsProps) {
  const clipId = useId();

  return (
    <div className={styles.reveal} data-open={open || undefined} inert={!open}>
      <div role="img" className={styles.row} aria-label={describeSession(round, phase)}>
        {Array.from({ length: FOCUS_ROUNDS }, (_, index) => {
          const focusStatus = sessionStatus(index, 'focus', round, phase);
          const breakStatus = sessionStatus(index, 'break', round, phase);
          const current = focusStatus === 'current';
          return (
            <span key={index} className={styles.pair}>
              <svg
                viewBox={`0 0 ${PILL_WIDTH} ${PILL_HEIGHT}`}
                className={styles.focus}
                data-status={focusStatus}
              >
                {current ? (
                  <defs>
                    <clipPath id={clipId}>
                      <rect width={PILL_WIDTH} height={PILL_HEIGHT} rx={PILL_HEIGHT / 2} />
                    </clipPath>
                  </defs>
                ) : null}
                <rect
                  className={styles.shape}
                  width={PILL_WIDTH}
                  height={PILL_HEIGHT}
                  rx={PILL_HEIGHT / 2}
                />
                {current ? (
                  <rect
                    className={styles.fill}
                    clipPath={`url(#${clipId})`}
                    width={(PILL_WIDTH * progress).toFixed(2)}
                    height={PILL_HEIGHT}
                  />
                ) : null}
              </svg>
              <svg
                viewBox="0 0 16 16"
                className={styles.leaf}
                data-status={breakStatus}
                data-long={index === FOCUS_ROUNDS - 1 || undefined}
              >
                <path className={styles.shape} d={LEAF_PATH} />
              </svg>
            </span>
          );
        })}
      </div>
    </div>
  );
}
