import type { AnchorHTMLAttributes, ComponentType, ReactNode } from 'react';
import { GearIcon, KeyboardIcon } from '@/components/base/icon';
import { Button } from '@/components/base/button/button';
import { Stack } from '@/components/base/stack/stack';
import linkStyles from '@/components/base/link/link.module.css';
import styles from './navbar.module.css';
import { FbowMark } from './fbow-mark';

export interface NavbarProps {
  appName?: string;
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>;
  navItems?: { href: string; label: string; current?: boolean }[];
  leadingActions?: ReactNode;
  onOpenShortcuts?: () => void;
  onOpenSettings?: () => void;
}

export function Navbar({
  appName = 'daily-focus',
  linkComponent,
  navItems = [],
  leadingActions,
  onOpenShortcuts,
  onOpenSettings,
}: NavbarProps) {
  const NavLink = linkComponent ?? 'a';
  return (
    <header className={styles.navbar}>
      <NavLink href="/" className={`${linkStyles.link} ${linkStyles.unadorned} ${styles.home}`}>
        <FbowMark className={styles.mark} />
        {appName}
      </NavLink>
      {navItems.length > 0 ? (
        <nav aria-label="Main" className={styles.navigation}>
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              className={styles['nav-link']}
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
      {leadingActions != null || onOpenShortcuts || onOpenSettings ? (
        <Stack>
          {leadingActions}
          {onOpenShortcuts ? (
            <Button
              variant="ghost"
              icon={KeyboardIcon}
              className={styles['action-keyboard-only']}
              onClick={onOpenShortcuts}
              aria-label="keyboard shortcuts"
            />
          ) : null}
          {onOpenSettings ? (
            <Button
              variant="ghost"
              icon={GearIcon}
              onClick={onOpenSettings}
              aria-label="settings"
            />
          ) : null}
        </Stack>
      ) : null}
    </header>
  );
}
