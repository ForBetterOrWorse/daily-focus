import { useId } from 'react';
import { CheckLgIcon } from '@/components/base/icon';
import { goalText } from '@/domain/goal-text';
import type { Item } from '@/domain/types';
import { CelebrateBurst } from './celebrate-burst';
import { HABIT_PATH, TASK_PATH } from './focus-shapes';
import styles from './item-tile.module.css';

export interface ItemTileProps {
  item: Item;
  amount: number;
  goal?: number;
  done: boolean;
  celebrate?: boolean;
  running: boolean;
  onTap: () => void;
}

export function ItemTile({
  item,
  amount,
  goal,
  done,
  celebrate = false,
  running,
  onTap,
}: ItemTileProps) {
  const clipId = useId();
  const goalLabel = goalText({
    completion: item.completion,
    timerStyle: item.timerStyle,
    target: goal,
  });
  const progress = done ? 1 : goal ? Math.min(Math.max(amount / goal, 0), 1) : 0;
  const fillTop = 100 - progress * 100;
  const showNumber = amount > 0 && !done && progress > 0;
  const path = item.kind === 'habit' ? HABIT_PATH : TASK_PATH;
  const action =
    item.completion === 'check'
      ? done
        ? 'Uncheck'
        : 'Check off'
      : item.completion === 'count'
        ? 'Add one'
        : done
          ? 'Reopen'
          : running
            ? 'Pause timer'
            : 'Start timer';
  const labelParts = [
    item.name,
    running ? 'running' : null,
    done ? 'done' : null,
    goalLabel ? `${amount} of ${goalLabel}` : null,
  ].filter(Boolean);

  return (
    <li>
      <button
        type="button"
        className={styles.tile}
        aria-label={`${labelParts.join(', ')}. ${action}`}
        data-running={running || undefined}
        data-done={done || undefined}
        data-celebrate={(done && celebrate) || undefined}
        onClick={onTap}
      >
        <span className={styles.shape}>
          <svg viewBox="0 0 100 100" aria-hidden="true" className={styles.svg}>
            <clipPath id={clipId}>
              <path d={path} />
            </clipPath>
            <rect
              className={styles.fill}
              x="0"
              width="100"
              y={fillTop.toFixed(1)}
              height={(100 - fillTop).toFixed(1)}
              clipPath={`url(#${clipId})`}
            />
            {showNumber ? (
              <>
                <clipPath id={`${clipId}-empty`}>
                  <rect x="0" y="0" width="100" height={fillTop.toFixed(1)} />
                </clipPath>
                <clipPath id={`${clipId}-fill`}>
                  <rect
                    x="0"
                    y={fillTop.toFixed(1)}
                    width="100"
                    height={(100 - fillTop).toFixed(1)}
                  />
                </clipPath>
                <text className={styles.number} x="50" y="50" clipPath={`url(#${clipId}-empty)`}>
                  {amount}
                </text>
                <text
                  className={`${styles.number} ${styles['number-on-fill']}`}
                  x="50"
                  y="50"
                  clipPath={`url(#${clipId}-fill)`}
                >
                  {amount}
                </text>
              </>
            ) : null}
            <path className={styles.edge} d={path} />
          </svg>
          {done && celebrate ? <CelebrateBurst /> : null}
          {done ? <CheckLgIcon className={styles.check} /> : null}
        </span>
        <span className={styles.name} aria-hidden="true">
          {item.name}
        </span>
        {goalLabel ? (
          <span className={styles.goal} aria-hidden="true">
            {goalLabel}
          </span>
        ) : null}
      </button>
    </li>
  );
}
