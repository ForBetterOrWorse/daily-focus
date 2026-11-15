import { STREAK_BLOB } from '@/components/features/focus-shapes';
import styles from './streak.module.css';

interface StreakProps {
  days: number;
}

export function Streak({ days }: StreakProps) {
  return (
    <span className={styles.streak} data-zero={days === 0 || undefined}>
      <span className="sr-only">{`${days}-day streak`}</span>
      <span className={styles.text} aria-hidden="true">
        <span className={styles.count}>
          <svg className={styles.blob} viewBox="0 0 120 100">
            <path d={STREAK_BLOB} />
          </svg>
          {days}
        </span>{' '}
        {days === 1 ? 'day' : 'days'}
      </span>
    </span>
  );
}
