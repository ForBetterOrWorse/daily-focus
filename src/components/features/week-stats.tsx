import { useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'wouter';
import { Link } from '@/components/base/link/link';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/base/icon';
import { hasTracked } from '@/domain/activity';
import { addDays, dayKeyOf, weekRange } from '@/domain/days';
import { NO_GROUP_NAME, weekStats } from '@/domain/stats';
import type { DayKey } from '@/domain/types';
import { useAppData, useNow } from '@/store/use-app-data';
import { formatDuration } from '@/utils/format-duration';
import { withViewTransition } from '@/utils/view-transition';
import styles from './week-stats.module.css';

const MS_PER_MINUTE = 60_000;

const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

interface BarRow {
  key: string;
  label: string;
  note?: string;
  ms: number;
}

interface BarTableProps {
  title: string;
  column: string;
  rows: BarRow[];
}

function formatDay(key: DayKey): string {
  return SHORT_DATE.format(new Date(`${key}T00:00:00Z`));
}

function rangeLabel(start: DayKey): string {
  return `${formatDay(start)} to ${formatDay(addDays(start, 6))}`;
}

function BarTable({ title, column, rows }: BarTableProps) {
  const max = Math.max(...rows.map((row) => row.ms), 1);
  const id = `${title.toLowerCase().replace(/\s+/g, '-')}-heading`;

  return (
    <section aria-labelledby={id} className={styles.panel}>
      <h2 id={id} className={styles['panel-title']}>
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className={styles['panel-empty']}>No time tracked in this range.</p>
      ) : (
        <table className={styles.bars} aria-labelledby={id}>
          <thead className="sr-only">
            <tr>
              <th scope="col">{column}</th>
              <th scope="col">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className={styles.row}>
                <th scope="row" className={styles.name}>
                  {row.label}
                  {row.note ? <span className={styles.note}>{row.note}</span> : null}
                </th>
                <td>
                  <span className={styles.time}>{formatDuration(row.ms / MS_PER_MINUTE)}</span>
                  <svg className={styles.track} aria-hidden="true">
                    <rect
                      className={styles.bar}
                      width={`${((row.ms / max) * 100).toFixed(1)}%`}
                      height="100%"
                      rx="4"
                    />
                    <rect className={styles.bar} width="8" height="100%" />
                  </svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function WeekStats() {
  const [weeksAgo, setWeeksAgo] = useState(0);
  const previousRef = useRef<HTMLButtonElement>(null);
  const data = useAppData((value) => value);
  const now = useNow(60_000);
  const tracked = hasTracked(data);
  const { weekStart, dayStartHour } = data.settings;
  const currentStart = weekRange(dayKeyOf(now, dayStartHour), weekStart).start;
  const shownStart = addDays(currentStart, -7 * weeksAgo);
  const stats = useMemo(() => weekStats(data, shownStart), [data, shownStart]);
  const range = rangeLabel(shownStart);
  const previousDisabled = !tracked;

  function changeWeek(next: number) {
    withViewTransition(() => setWeeksAgo(next));
    if (next === 0) {
      previousRef.current?.focus();
    }
  }

  return (
    <div className={styles.stats}>
      <div className={styles.head}>
        <h1 className={styles.title}>Stats</h1>
        <div className={styles.week} role="group" aria-label="Week">
          <button
            ref={previousRef}
            type="button"
            className={styles['week-button']}
            aria-label="Previous week"
            aria-disabled={previousDisabled || undefined}
            onClick={() => {
              if (!previousDisabled) {
                changeWeek(weeksAgo + 1);
              }
            }}
          >
            <ArrowLeftIcon />
          </button>
          <p className={styles['week-label']} aria-live="polite">
            {weeksAgo === 0 ? 'This week' : range}
          </p>
          <button
            type="button"
            className={styles['week-button']}
            aria-label="Next week"
            inert={weeksAgo === 0}
            onClick={() => {
              if (weeksAgo > 0) {
                changeWeek(weeksAgo - 1);
              }
            }}
          >
            <ArrowRightIcon />
          </button>
        </div>
      </div>

      {tracked ? (
        <>
          <p className={styles.total}>
            <span className={styles['total-value']}>
              {formatDuration(stats.totalMs / MS_PER_MINUTE)}
            </span>
            <span className={styles['total-label']}>{range}</span>
          </p>

          <div className={styles.panels}>
            <BarTable
              title="By group"
              column="Group"
              rows={stats.byGroup.map((group) => ({
                key: group.groupId ?? NO_GROUP_NAME,
                label: group.name,
                ms: group.ms,
              }))}
            />
            <BarTable
              title="By task and habit"
              column="Item"
              rows={stats.byItem.map((item) => {
                const group = item.groupName ?? NO_GROUP_NAME;
                return {
                  key: item.itemId,
                  label: item.name,
                  note: item.kind === 'habit' ? `Habit · ${group}` : group,
                  ms: item.ms,
                };
              })}
            />
          </div>
        </>
      ) : (
        <div className={styles.empty}>
          <p className={styles['empty-text']}>
            No time tracked yet.{' '}
            <Link href="/" linkComponent={RouterLink}>
              Get started
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
