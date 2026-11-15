import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useToast, type ShowToast } from '@/components/base/toast/toast-context';
import { currentClock, nextIntervalEnd, phaseDuration } from '@/domain/clock';
import { displayName } from '@/domain/items';
import {
  intervalEndMessage,
  missedEndMessage,
  phaseEndOf,
  type PhaseEnd,
} from '@/domain/phase-end';
import { claimAlert, readAlertPreferences } from '@/hooks/use-alert-preferences';
import { useAppData, useDispatch, useNow, useTakeMissedPhaseEnd } from '@/store/use-app-data';
import { playChime, unlockChime } from '@/utils/chime';
import { formatClock } from '@/utils/format-clock';
import { showNotification } from '@/utils/notify';
import { seoConfig } from '@/utils/seo.config';

const SETTLE_MARGIN_MS = 50;
const LATE_MS = 60_000;
const PHASE_LABELS = { focus: 'Focus', break: 'Break', 'long-break': 'Long break' } as const;

function alertPhaseEnd(end: PhaseEnd, now: number, showToast: ShowToast) {
  if (now - end.endedAt > LATE_MS) {
    const timeText = new Date(end.endedAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    showToast({ message: missedEndMessage(end.started, end.settled, timeText), duration: null });
    return;
  }

  const message = intervalEndMessage(end.started, end.settled);
  showToast({ message });
  if (!claimAlert(`${end.itemId}:${end.endedAt}`)) {
    return;
  }
  const { soundEnabled, notificationsEnabled } = readAlertPreferences();
  if (soundEnabled) {
    playChime();
  }
  if (notificationsEnabled && !document.hasFocus()) {
    showNotification(end.name, message);
  }
}

export function PhaseAlerts(): null {
  const data = useAppData((appData) => appData);
  const dispatch = useDispatch();
  const showToast = useToast();
  const takeMissedPhaseEnd = useTakeMissedPhaseEnd();
  const now = useNow(1000);
  const [path] = useLocation();
  const previousData = useRef(data);
  const baseTitle = useRef('');
  const writtenTitle = useRef<string | null>(null);

  const intervalEnd = nextIntervalEnd(data, now);
  useEffect(() => {
    if (intervalEnd === null) {
      return;
    }
    const timeout = window.setTimeout(
      () => dispatch({ type: 'settle' }),
      Math.max(0, intervalEnd - Date.now()) + SETTLE_MARGIN_MS
    );
    return () => window.clearTimeout(timeout);
  }, [dispatch, intervalEnd]);

  useEffect(() => {
    const settle = () => dispatch({ type: 'settle' });
    const settleWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        settle();
      }
    };
    document.addEventListener('visibilitychange', settleWhenVisible);
    window.addEventListener('pageshow', settle);
    window.addEventListener('focus', settle);
    return () => {
      document.removeEventListener('visibilitychange', settleWhenVisible);
      window.removeEventListener('pageshow', settle);
      window.removeEventListener('focus', settle);
    };
  }, [dispatch]);

  useEffect(() => {
    const unlock = () => {
      unlockChime();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const before = previousData.current;
    previousData.current = data;
    if (before === data) {
      return;
    }
    const end = phaseEndOf(before, data);
    if (end) {
      alertPhaseEnd(end, Date.now(), showToast);
    }
  }, [data, showToast]);

  useEffect(() => {
    const end = takeMissedPhaseEnd();
    if (end) {
      alertPhaseEnd(end, Date.now(), showToast);
    }
  }, [takeMissedPhaseEnd, showToast]);

  useEffect(() => {
    if (document.title !== writtenTitle.current) {
      baseTitle.current = document.title;
    }
    const { run } = data;
    if (run) {
      const clock = currentClock(data, run.itemId, now);
      const sessions = clock.style === 'sessions';
      const clockText = formatClock(
        sessions
          ? Math.ceil(Math.max(0, phaseDuration(clock) - clock.elapsedMs) / 1000)
          : Math.floor(clock.elapsedMs / 1000)
      );
      const item = data.items.find((candidate) => candidate.id === run.itemId);
      const label = sessions ? PHASE_LABELS[clock.phase] : item ? displayName(item) : 'Timer';
      const title = `${clockText} ${label} | ${seoConfig.siteTitle}`;
      document.title = title;
      writtenTitle.current = title;
    } else if (document.title === writtenTitle.current) {
      document.title = baseTitle.current;
      writtenTitle.current = null;
    }
  }, [data, now, path]);

  useEffect(
    () => () => {
      if (document.title === writtenTitle.current) {
        document.title = baseTitle.current;
      }
    },
    []
  );

  return null;
}
