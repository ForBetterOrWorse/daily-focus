import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Banner } from '@/components/base/banner/banner';
import { activitiesOn, hasTracked, isSkipOffered, isSkipped, skipsLeft } from '@/domain/activity';
import { dayKeyOf } from '@/domain/days';
import { amountOn, displayName, isDoneOn } from '@/domain/items';
import type { AppData, DayKey, Item } from '@/domain/types';
import { useAppData, useDispatch, useNow } from '@/store/use-app-data';
import { formatDuration } from '@/utils/format-duration';
import styles from './day-breakdown.module.css';

const MONTH_DAY = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

interface DayBreakdownProps {
  selectedDay: DayKey | null;
}

interface RevealProps {
  open: boolean;
  children: ReactNode;
}

function Reveal({ open, children }: RevealProps) {
  return (
    <div className={styles.reveal} data-open={open || undefined} inert={!open} aria-hidden={!open}>
      <div className={styles['reveal-inner']}>
        <div className={styles['reveal-content']}>{children}</div>
      </div>
    </div>
  );
}

function formatDay(day: DayKey): string {
  return MONTH_DAY.format(new Date(`${day}T00:00:00Z`));
}

function rowText(data: AppData, item: Item, day: DayKey): string {
  const parts = [displayName(item)];
  const minutes = item.completion === 'time' ? amountOn(data, item, day) : 0;
  if (minutes > 0) {
    parts.push(formatDuration(minutes));
  }
  if (item.kind === 'task' && isDoneOn(data, item, day)) {
    parts.push('Done');
  }
  return parts.join(' · ');
}

export function DayBreakdown({ selectedDay }: DayBreakdownProps) {
  const data = useAppData((value) => value);
  const dispatch = useDispatch();
  const now = useNow(60_000);
  const [shownDay, setShownDay] = useState<DayKey | null>(selectedDay);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [refocus, setRefocus] = useState(0);

  if (selectedDay !== null && selectedDay !== shownDay) {
    setShownDay(selectedDay);
  }

  useEffect(() => {
    if (refocus > 0) {
      titleRef.current?.focus();
    }
  }, [refocus]);

  if (!hasTracked(data)) {
    return null;
  }

  const today = dayKeyOf(now, data.settings.dayStartHour);
  const month = today.slice(0, 7);
  const day = shownDay;
  const activities = day === null ? [] : activitiesOn(data, day);
  const empty = activities.length === 0;
  const skipped = day !== null && isSkipped(data, day);
  const offeredDay = day !== null && isSkipOffered(data, day, today) ? day : null;
  const allowance = skipsLeft(data, month);
  const skipBannerOpen = offeredDay !== null && selectedDay === offeredDay && allowance > 0;

  function renderMessage() {
    if (day === null || !empty) {
      return null;
    }
    if (skipped) {
      return <p className={styles.line}>Skipped. The streak continues through this day.</p>;
    }
    if (offeredDay !== null && allowance === 0) {
      return <p className={styles.line}>No skips left this month.</p>;
    }
    return null;
  }

  return (
    <div className={styles.root}>
      <Reveal open={selectedDay !== null}>
        {day !== null ? (
          <div className={styles.breakdown}>
            <h3 ref={titleRef} tabIndex={-1} className={styles.title}>
              {day === today ? 'Today, ' : ''}
              {formatDay(day)} · {activities.length}{' '}
              {activities.length === 1 ? 'activity' : 'activities'}
            </h3>
            {!empty ? (
              <ul className={styles.list}>
                {activities.map((item) => (
                  <li key={item.id}>{rowText(data, item, day)}</li>
                ))}
              </ul>
            ) : null}
            <div role="status">{renderMessage()}</div>
          </div>
        ) : null}
      </Reveal>
      <Reveal open={skipBannerOpen}>
        {offeredDay !== null && allowance > 0 ? (
          <Banner ariaLabel="Skip" dismissible={false}>
            Missed yesterday? Use a skip to keep your streak.{' '}
            <button
              type="button"
              className={styles['banner-action']}
              onClick={() => {
                dispatch({ type: 'useSkip', day: offeredDay });
                setRefocus((count) => count + 1);
              }}
            >
              Use a skip ({allowance} left this month)
            </button>
          </Banner>
        ) : null}
      </Reveal>
    </div>
  );
}
