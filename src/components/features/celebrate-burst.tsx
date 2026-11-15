import styles from './celebrate-burst.module.css';

const BURST_ARMS = [0, 1, 2, 3, 4, 5, 6, 7];

export function CelebrateBurst() {
  return (
    <span className={styles.burst} aria-hidden="true">
      {BURST_ARMS.map((arm) => (
        <span key={arm} className={styles.arm}>
          <span className={styles.dot} />
        </span>
      ))}
    </span>
  );
}
