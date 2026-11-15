import type { ReactNode } from 'react';
import styles from './fold.module.css';

export interface FoldProps {
  open: boolean;
  children: ReactNode;
}

export function Fold({ open, children }: FoldProps) {
  return (
    <div className={styles.fold} data-open={open || undefined} inert={!open} aria-hidden={!open}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
