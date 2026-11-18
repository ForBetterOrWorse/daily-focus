import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/base/button/button';
import { CheckLgIcon } from '@/components/base/icon';
import pillStyles from '@/components/base/pill-group/pill-group.module.css';
import { Stack } from '@/components/base/stack/stack';
import { useToast } from '@/components/base/toast/toast-context';
import { useAnnounce } from '@/components/features/live-announcer';
import { currentClock, phaseDuration } from '@/domain/clock';
import { dayKeyOf } from '@/domain/days';
import { nextQuickNumber } from '@/domain/quick-sessions';
import { displayName, isDoneOn } from '@/domain/items';
import type { AppData, Item, ItemClock, TimerStyle } from '@/domain/types';
import { useOrbit } from '@/hooks/use-orbit';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useShortcut } from '@/hooks/use-shortcut';
import { useAppData, useDispatch } from '@/store/use-app-data';
import { formatClock } from '@/utils/format-clock';
import { buildOrbitProfile, orbitSegments, restingOrbit } from '@/utils/orbit-physics';
import { ArrowCounterclockwiseIcon, PauseFillIcon, PlayFillIcon, StopwatchIcon } from './app-icons';
import { DIAL_SIZE, pickTimerShape, traceSegments } from './focus-shapes';
import { FocusSessions } from './focus-sessions';
import styles from './focus-card.module.css';

const QUICK_DIAL_KEY = 'quick';
const TIMER_STYLES: { value: TimerStyle; label: string; start: string }[] = [
  { value: 'sessions', label: 'Focus sessions', start: '25:00' },
  { value: 'free', label: 'Free run', start: '0:00' },
];

interface FocusCardProps {
  /** The output of `cardItem`. `null` is a fresh quick session. */
  item: Item | null;
  now: number;
}

function nameOf(data: AppData, itemId: string): string {
  const item = data.items.find((candidate) => candidate.id === itemId);
  return item ? displayName(item) : 'Timer';
}

function stopMessage(
  data: AppData,
  previousRun: NonNullable<AppData['run']>,
  now: number
): string | null {
  const name = nameOf(data, previousRun.itemId);
  const settled = data.clocks[previousRun.itemId];
  if (
    settled &&
    (settled.phase !== previousRun.clock.phase || settled.round !== previousRun.clock.round)
  ) {
    return null;
  }
  if (data.meta.autoStop?.itemId === previousRun.itemId) {
    return `${name} stopped after 12 hours.`;
  }
  const stopped = data.items.find((candidate) => candidate.id === previousRun.itemId);
  const day = dayKeyOf(now, data.settings.dayStartHour);
  return stopped && isDoneOn(data, stopped, day, now)
    ? `${name} done. Timer stopped.`
    : `${name} paused.`;
}

export function FocusCard({ item, now }: FocusCardProps) {
  const data = useAppData((appData) => appData);
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const reducedMotion = useReducedMotion();
  const showToast = useToast();
  const itemId = item?.id ?? null;
  const quick = item === null || item.kind === 'quick';
  const quickItem = item?.kind === 'quick' ? item : null;
  const day = dayKeyOf(now, data.settings.dayStartHour);
  const running = itemId !== null && data.run?.itemId === itemId;
  const clock: ItemClock =
    itemId === null
      ? { style: data.meta.quickStyle, phase: 'focus', round: 1, elapsedMs: 0, day }
      : currentClock(data, itemId, now);
  const dialKey = quick ? QUICK_DIAL_KEY : itemId;
  const [dial, setDial] = useState(() => ({
    key: dialKey,
    shape: pickTimerShape(Math.random),
  }));
  const [draft, setDraft] = useState({ forId: itemId, text: quickItem?.name ?? '' });
  const pendingStyle = useRef<TimerStyle | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const orbitPaths = useRef<(SVGPathElement | null)[]>([]);
  const focusName = useRef(false);
  const previousData = useRef(data);
  const nowRef = useRef(now);
  nowRef.current = now;

  if (dial.key !== dialKey) {
    setDial({ key: dialKey, shape: pickTimerShape(Math.random, dial.shape.id) });
  }

  if (draft.forId !== itemId) {
    setDraft({
      forId: itemId,
      text: draft.forId === null && draft.text !== '' ? draft.text : (quickItem?.name ?? ''),
    });
  }

  useEffect(() => {
    if (quickItem && pendingStyle.current !== null) {
      const style = pendingStyle.current;
      pendingStyle.current = null;
      dispatch({ type: 'setQuickStyle', itemId: quickItem.id, style });
    }
  }, [dispatch, quickItem]);

  useEffect(() => {
    if (quickItem && focusName.current) {
      focusName.current = false;
      nameInput.current?.focus();
    }
  }, [quickItem]);

  useEffect(() => {
    const before = previousData.current;
    previousData.current = data;
    const previousRun = before.run;
    const nextRun = data.run;

    if (previousRun?.itemId === nextRun?.itemId) {
      return;
    }

    if (nextRun) {
      const existed = before.items.some((candidate) => candidate.id === nextRun.itemId);
      const verb =
        existed && currentClock(before, nextRun.itemId, nowRef.current).elapsedMs > 0
          ? 'resumed'
          : 'started';
      const started = `${nameOf(data, nextRun.itemId)} ${verb}.`;
      announce(previousRun ? `${nameOf(before, previousRun.itemId)} paused. ${started}` : started);
      return;
    }

    if (previousRun) {
      const message = stopMessage(data, previousRun, nowRef.current);
      if (message !== null) {
        announce(message);
      }
    }
  }, [announce, data]);

  function toggle() {
    if (itemId === null) {
      dispatch({ type: 'newQuickSession', start: true });
      return;
    }
    dispatch(running ? { type: 'pause' } : { type: 'start', itemId });
  }

  useShortcut({ key: 's', shift: true }, (event) => {
    event.preventDefault();
    toggle();
  });

  function changeName(event: ChangeEvent<HTMLInputElement>) {
    const text = event.target.value;
    setDraft({ forId: itemId, text });
    if (quickItem) {
      dispatch({ type: 'renameQuick', itemId: quickItem.id, name: text });
    } else if (text.trim() !== '') {
      dispatch({ type: 'newQuickSession', start: false, name: text });
    }
  }

  function changeStyle(style: TimerStyle, start: string) {
    announce(`${TIMER_STYLES.find((option) => option.value === style)?.label}, ${start}`);
    if (quickItem) {
      dispatch({ type: 'setQuickStyle', itemId: quickItem.id, style });
    } else {
      pendingStyle.current = style;
      dispatch({ type: 'newQuickSession', start: false });
    }
  }

  function startQuickSession() {
    focusName.current = true;
    dispatch({ type: 'newQuickSession', start: true });
  }

  const sessions = clock.style === 'sessions';
  const duration = phaseDuration(clock);
  const started = running || clock.elapsedMs > 0;
  const orbiting = !sessions && !reducedMotion;
  const orbitProfile = useMemo(() => buildOrbitProfile(dial.shape.path), [dial.shape.path]);
  useOrbit(orbitPaths, { enabled: orbiting && started, running, profile: orbitProfile });
  const progress = Math.min(clock.elapsedMs / duration, 1);
  const segments = sessions
    ? progress > 0
      ? traceSegments(progress)
      : []
    : !started
      ? []
      : reducedMotion
        ? traceSegments(1)
        : orbitSegments(restingOrbit(orbitProfile));
  const traceKey = `${dialKey}-${clock.style}-${started}`;
  const clockText = formatClock(
    sessions
      ? Math.ceil(Math.max(0, duration - clock.elapsedMs) / 1000)
      : Math.floor(clock.elapsedMs / 1000)
  );
  const canReset =
    itemId !== null && (clock.elapsedMs > 0 || clock.phase !== 'focus' || clock.round !== 1);
  const heroLabel = running ? 'Pause' : clock.elapsedMs > 0 ? 'Resume' : 'Start';

  function reset() {
    if (itemId === null) {
      return;
    }
    dispatch({ type: 'reset', itemId });
    if (!running) {
      announce(`${nameOf(data, itemId)} reset.`);
    }
  }

  function markDone() {
    if (item === null) {
      return;
    }
    const snapshot = data;
    dispatch({ type: 'markDone', itemId: item.id });
    showToast({
      message: `${displayName(item)} done`,
      action: { label: 'Undo', onAction: () => dispatch({ type: 'restore', snapshot }) },
    });
  }

  return (
    <section aria-label="Timer" className={styles.card} data-free={!sessions || undefined}>
      {quick ? (
        <fieldset className={`${pillStyles.group} ${styles['style-pills']}`}>
          <legend className="sr-only">Timer style</legend>
          <Stack gap="md" justify="center">
            {TIMER_STYLES.map(({ value, label, start }) => (
              <label key={value} className={`${pillStyles.pill} ${styles['style-pill']}`}>
                <input
                  type="radio"
                  name="quick-timer-style"
                  className={pillStyles.input}
                  checked={clock.style === value}
                  onChange={() => changeStyle(value, start)}
                />
                <span>{label}</span>
              </label>
            ))}
          </Stack>
        </fieldset>
      ) : (
        <Button
          variant="primary"
          size="sm"
          shape="round"
          className={styles['new-session']}
          icon={StopwatchIcon}
          onClick={startQuickSession}
        >
          Start a quick session
        </Button>
      )}
      <div className={styles.dial}>
        <svg
          viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
          aria-hidden="true"
          className={styles['dial-svg']}
        >
          <path className={styles['dial-fill']} d={dial.shape.path} />
          <path className={styles['dial-track']} d={dial.shape.path} pathLength={100} />
          <g
            key={traceKey}
            className={styles['dial-trace-group']}
            data-orbit={orbiting || undefined}
          >
            {segments.map((segment, index) => (
              <path
                key={index}
                className={styles['dial-trace']}
                d={dial.shape.path}
                pathLength={100}
                stroke={`color-mix(in oklch, var(--color-highlight-mark) ${(segment.mix * 100).toFixed(1)}%, var(--color-progress))`}
                strokeDasharray={`${segment.length.toFixed(3)} ${sessions ? 100 : (100 - segment.length).toFixed(3)}`}
                strokeDashoffset={(-segment.start).toFixed(3)}
                ref={(element) => {
                  orbitPaths.current[index] = element;
                }}
              />
            ))}
          </g>
        </svg>
        <div className={styles['dial-center']}>
          <span className={styles.clock} data-paused={!running || undefined}>
            {clockText}
          </span>
        </div>
      </div>

      <div key={dialKey} className={styles.run}>
        <FocusSessions
          round={clock.round}
          phase={clock.phase === 'focus' ? 'focus' : 'break'}
          progress={progress}
          open={sessions}
        />
        <div className={styles['run-heading']}>
          {quick ? (
            <input
              type="text"
              aria-label="Session name"
              className={styles['name-input']}
              ref={nameInput}
              placeholder={`Session ${quickItem?.number ?? nextQuickNumber(data, day)}`}
              value={draft.text}
              onChange={changeName}
            />
          ) : (
            <p className={styles['run-name']}>{item ? displayName(item) : ''}</p>
          )}
        </div>
        <div className={styles.controls}>
          <div className={styles['controls-start']}>
            {quick ? null : (
              <Button
                variant="primary"
                size="lg"
                className={styles['done-button']}
                icon={CheckLgIcon}
                aria-label="Mark done"
                onClick={markDone}
              />
            )}
          </div>
          <Button
            variant="cta"
            className={styles.hero}
            data-paused={!running || undefined}
            icon={running ? PauseFillIcon : PlayFillIcon}
            aria-label={heroLabel}
            onClick={toggle}
          />
          <div
            className={styles['reset-slot']}
            data-visible={canReset || undefined}
            aria-hidden={!canReset}
            inert={!canReset}
          >
            <Button
              variant="primary"
              size="lg"
              icon={ArrowCounterclockwiseIcon}
              aria-label="Reset"
              onClick={reset}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
