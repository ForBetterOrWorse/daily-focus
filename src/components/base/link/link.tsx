import type { AnchorHTMLAttributes, ComponentType } from 'react';
import styles from './link.module.css';

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  variant?: 'default' | 'unadorned';
  external?: boolean;
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>;
}

export function Link({
  children,
  className,
  variant = 'default',
  external = false,
  linkComponent,
  ...rest
}: LinkProps) {
  const LinkElement = external ? 'a' : (linkComponent ?? 'a');
  return (
    <LinkElement
      className={[styles.link, variant === 'unadorned' ? styles.unadorned : null, className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </LinkElement>
  );
}
