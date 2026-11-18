import { useState } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import { FbowFooterCredit } from '@/components/base/navbar/footer-credit';
import { Navbar } from '@/components/base/navbar/navbar';
import {
  ShortcutsModal,
  type ShortcutEntry,
} from '@/components/base/shortcuts-modal/shortcuts-modal';
import { SkipLink } from '@/components/base/skip-link/skip-link';
import { ToastProvider } from '@/components/base/toast/toast';
import { LiveAnnouncerProvider } from './components/features/live-announcer';
import { PhaseAlerts } from './components/features/phase-alerts';
import { useScrollToHash } from './hooks/use-scroll-to-hash';
import { useTheme } from './hooks/use-theme';
import { Settings } from './pages/settings';
import { Stats } from './pages/stats';
import { Today } from './pages/today';
import styles from './app.module.css';

const SHORTCUTS: ShortcutEntry[] = [
  { keys: ['S'], action: 'Start or pause the timer' },
  { keys: ['\\'], action: 'Show or hide Habits and Tasks (wide screens)' },
];

export function App() {
  const [path] = useLocation();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  useTheme();
  useScrollToHash();

  function openShortcuts() {
    setOpener(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setShortcutsOpen(true);
  }

  const navItems = [
    { href: '/', label: 'Today' },
    { href: '/stats', label: 'Stats' },
    { href: '/settings', label: 'Settings' },
  ].map((item) => ({ ...item, current: path === item.href }));

  return (
    <ToastProvider position="top-center">
      <LiveAnnouncerProvider>
        <div className={styles.app}>
          <SkipLink targetId="main">Skip to main content</SkipLink>
          <Navbar
            appName="Daily Focus"
            navItems={navItems}
            linkComponent={Link}
            onOpenShortcuts={openShortcuts}
          />
          <main id="main" tabIndex={-1} className={styles.main}>
            <Switch>
              <Route path="/" component={Today} />
              <Route path="/stats" component={Stats} />
              <Route path="/settings" component={Settings} />
            </Switch>
          </main>
          <PhaseAlerts />
          {path === '/settings' ? (
            <FbowFooterCredit href="https://fbow.org" className={styles.footer} />
          ) : null}
          <ShortcutsModal
            open={shortcutsOpen}
            onClose={() => setShortcutsOpen(false)}
            shortcuts={SHORTCUTS}
            triggerElement={opener}
          />
        </div>
      </LiveAnnouncerProvider>
    </ToastProvider>
  );
}
