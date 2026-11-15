import { Link } from '@/components/base/link/link';
import { FbowMark } from './fbow-mark';
import styles from './footer-credit.module.css';

export interface FbowFooterCreditProps {
  href: string;
  tagline?: string;
  className?: string;
}

export function FbowFooterCredit({ href, tagline, className }: FbowFooterCreditProps) {
  const footerCreditClassName = className
    ? `${styles['footer-credit']} ${className}`
    : styles['footer-credit'];

  return (
    <footer className={footerCreditClassName}>
      <FbowMark className={styles.mark} />
      <p className={styles.copy}>
        Made by the{' '}
        <Link href={href} external>
          ForBetterOrWorse
        </Link>{' '}
        team.
        {tagline ? <> {tagline}</> : null}
      </p>
    </footer>
  );
}
