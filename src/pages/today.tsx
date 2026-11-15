import { useEffect, useId, useRef, useState } from 'react';
import { Banner } from '@/components/base/banner/banner';
import { Button } from '@/components/base/button/button';
import { Container } from '@/components/base/container/container';
import { ArrowDownIcon } from '@/components/base/icon';
import { streak as streakLength } from '@/domain/activity';
import { cardItem } from '@/domain/card';
import { dayKeyOf } from '@/domain/days';
import { displayName, type ItemSection as Section } from '@/domain/items';
import { columnsShown } from '@/domain/layout';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useShortcut } from '@/hooks/use-shortcut';
import { BackupBanner } from '@/components/features/backup-banner';
import { ColumnsControl } from '@/components/features/columns-control';
import { FocusCard } from '@/components/features/focus-card';
import { ItemSection } from '@/components/features/item-section';
import { Streak } from '@/components/features/streak';
import { useSaveOffer } from '@/hooks/use-save-offer';
import { useSeoMeta } from '@/hooks/use-seo-meta';
import { useAppData, useDispatch, useNow } from '@/store/use-app-data';
import { seoConfig } from '@/utils/seo.config';
import { withViewTransition } from '@/utils/view-transition';
import styles from './today.module.css';

const WIDE_QUERY = '(min-width: 1024px)';

function dateParts(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: 'long', timeZone: 'UTC' }),
    monthDay: date.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }),
  };
}

export function Today() {
  const [drawer, setDrawer] = useState<{ section: Section; view: 'form' | 'list' } | null>(null);
  const data = useAppData((value) => value);
  const dispatch = useDispatch();
  const now = useNow(1000);
  const wide = useMediaQuery(WIDE_QUERY);
  const reducedMotion = useReducedMotion();
  const sectionsId = useId();
  const layoutRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const focusToggleRef = useRef(false);
  const day = dayKeyOf(now, data.settings.dayStartHour);
  const item = cardItem(data, day, now);
  const stoppedItem = data.meta.autoStop
    ? data.items.find((candidate) => candidate.id === data.meta.autoStop?.itemId)
    : undefined;
  const shown = columnsShown(data);
  const invited = data.meta.columnsOpen === null;
  const { weekday, monthDay } = dateParts(day);
  useSaveOffer();
  useSeoMeta({ title: `Today | ${seoConfig.siteTitle}`, path: '/' });
  useShortcut({ key: 'e', shift: true }, (event) => {
    event.preventDefault();
    if (wide && !shown) {
      withViewTransition(() => dispatch({ type: 'setColumnsOpen', open: true }));
    }
    setDrawer({ section: 'tasks', view: 'form' });
  });
  useShortcut(
    { key: '\\' },
    (event) => {
      event.preventDefault();
      toggleColumns();
    },
    { enabled: wide }
  );

  useEffect(() => {
    if (!focusToggleRef.current || invited) {
      return;
    }
    focusToggleRef.current = false;
    layoutRef.current?.querySelector<HTMLElement>('[aria-keyshortcuts]')?.focus();
  }, [invited]);

  function toggleColumns() {
    focusToggleRef.current = invited;
    withViewTransition(() => dispatch({ type: 'setColumnsOpen', open: !shown }));
  }

  function jumpToSections() {
    sectionsRef.current?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    sectionsRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }

  function openNew(section: Section) {
    setDrawer({ section, view: 'form' });
  }

  function closeNew(section: Section) {
    setDrawer((current) => (current?.section === section ? null : current));
  }

  return (
    <Container as="section" size="xl" className={styles.page}>
      <h1 className="sr-only">Today</h1>
      <BackupBanner />
      {stoppedItem ? (
        <Banner announce onDismiss={() => dispatch({ type: 'dismissAutoStop' })}>
          {displayName(stoppedItem)} ran for 12 hours, so it stopped and saved 12 h.
        </Banner>
      ) : null}
      <div ref={layoutRef} className={styles.layout} data-timer-only={!shown || undefined}>
        <div className={styles.today}>
          <p className={styles.date}>
            {weekday}
            <span className={styles['date-sub']}>{monthDay}</span>
          </p>
          <div className={styles.streak}>
            <Streak days={streakLength(data, day)} />
          </div>
        </div>

        {wide ? (
          <ColumnsControl
            variant={invited ? 'invite' : 'toggle'}
            open={shown}
            controlsId={sectionsId}
            onToggle={toggleColumns}
          />
        ) : null}

        <div className={styles['card-group']}>
          <FocusCard item={item} now={now} />
        </div>

        {wide ? null : (
          <Button variant="primary" className={styles.jump} onClick={jumpToSections}>
            <ArrowDownIcon />
            Habits and tasks
          </Button>
        )}

        <div ref={sectionsRef} id={sectionsId} className={styles.sections} hidden={wide && !shown}>
          <ItemSection
            section="habits"
            newItemOpen={drawer?.section === 'habits' && drawer.view === 'form'}
            listOpen={drawer?.section === 'habits' && drawer.view === 'list'}
            onEdit={() => setDrawer({ section: 'habits', view: 'list' })}
            onNew={() => openNew('habits')}
            onNewClose={() => closeNew('habits')}
          />
          <ItemSection
            section="tasks"
            newItemOpen={drawer?.section === 'tasks' && drawer.view === 'form'}
            listOpen={drawer?.section === 'tasks' && drawer.view === 'list'}
            onEdit={() => setDrawer({ section: 'tasks', view: 'list' })}
            onNew={() => openNew('tasks')}
            onNewClose={() => closeNew('tasks')}
          />
        </div>
      </div>
    </Container>
  );
}
