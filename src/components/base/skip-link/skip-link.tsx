import type { AnchorHTMLAttributes, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import styles from './skip-link.module.css';

export interface SkipLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'children' | 'href'
> {
  targetId: string;
  children: ReactNode;
}

export function SkipLink({ targetId, children, className, onClick, ...rest }: SkipLinkProps) {
  function focusTarget(event: ReactMouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (!event.defaultPrevented) {
      document.getElementById(targetId)?.focus();
    }
  }

  return (
    <a
      {...rest}
      className={[styles.link, className].filter(Boolean).join(' ')}
      href={`#${targetId}`}
      onClick={focusTarget}
    >
      {children}
    </a>
  );
}
