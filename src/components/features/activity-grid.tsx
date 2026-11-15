import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { buildGrid, hasTracked } from '@/domain/activity';
import { addDays, dayKeyOf } from '@/domain/days';
import type { DayKey } from '@/domain/types';
import { useAppData, useNow } from '@/store/use-app-data';
import styles from './activity-grid.module.css';

const MONTH_DAY = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

const STEPS: Record<string, number> = {
  ArrowUp: -1,
  ArrowDown: 1,
  ArrowLeft: -7,
  ArrowRight: 7,
};

interface ActivityGridProps {
  selectedDay: DayKey | null;
  onSelectDay: (day: DayKey) => void;
}

function formatDay(day: DayKey): string {
  return MONTH_DAY.format(new Date(`${day}T00:00:00Z`));
}

function monthOf(day: DayKey): string {
  return MONTH.format(new Date(`${day}T00:00:00Z`));
}

function activityLabel(count: number): string {
  return `${count} ${count === 1 ? 'activity' : 'activities'}`;
}

function GridBody({ selectedDay, onSelectDay }: ActivityGridProps) {
  const data = useAppData((value) => value);
  const now = useNow(60_000);
  const { weekStart, dayStartHour } = data.settings;
  const today = dayKeyOf(now, dayStartHour);
  const weeks = useMemo(() => buildGrid(data, today, weekStart), [data, today, weekStart]);
  const firstDay = weeks[0][0].day;
  const [focusDay, setFocusDay] = useState<DayKey | null>(null);
  const activeDay = focusDay ?? selectedDay ?? today;
  const scroller = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scroller.current;
    if (element) {
      element.scrollLeft = element.scrollWidth;
    }
  }, []);

  function moveFocus(event: KeyboardEvent, step: number) {
    event.preventDefault();
    const target = addDays(activeDay, step);
    if (target < firstDay || target > today) {
      return;
    }
    setFocusDay(target);
    grid.current?.querySelector<HTMLElement>(`[data-day="${target}"]`)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent) {
    const step = STEPS[event.key];
    if (step !== undefined) {
      moveFocus(event, step);
    }
  }

  return (
    <div ref={scroller} className={styles.scroll}>
      <div ref={grid} className={styles.grid} role="group" aria-label="Activity, last 12 months">
        {weeks.map((week, index) => {
          const monthChanged =
            index > 0 && monthOf(week[0].day) !== monthOf(weeks[index - 1][0].day);
          return (
            <div key={week[0].day} className={styles.week}>
              <span className={styles.month} aria-hidden="true">
                {monthChanged ? monthOf(week[0].day) : ''}
              </span>
              {week.map((cell) =>
                cell.future ? (
                  <span key={cell.day} className={styles.cell} data-future aria-hidden="true" />
                ) : (
                  <button
                    key={cell.day}
                    type="button"
                    className={styles.cell}
                    data-day={cell.day}
                    data-level={cell.level}
                    tabIndex={cell.day === activeDay ? 0 : -1}
                    aria-pressed={cell.day === selectedDay}
                    aria-label={`${formatDay(cell.day)}: ${activityLabel(cell.count)}`}
                    onClick={() => {
                      setFocusDay(cell.day);
                      onSelectDay(cell.day);
                    }}
                    onFocus={() => setFocusDay(cell.day)}
                    onKeyDown={handleKeyDown}
                  />
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ActivityGrid(props: ActivityGridProps) {
  const tracked = useAppData(hasTracked);

  if (!tracked) {
    return null;
  }

  return (
    <section
      id="stats-activity"
      tabIndex={-1}
      aria-labelledby="activity-heading"
      className={styles.activity}
    >
      <h2 id="activity-heading" className={styles.title}>
        Activity
      </h2>
      <GridBody {...props} />
    </section>
  );
}
