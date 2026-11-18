import { useEffect } from 'react';
import { HEARTBEAT_MS } from '@/domain/clock';
import { useAppData, useDispatch } from '@/store/use-app-data';

export function useRunHeartbeat(): void {
  const dispatch = useDispatch();
  const isRunning = useAppData((data) => data.run !== null);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const beat = () => dispatch({ type: 'heartbeat' });
    const beatWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        beat();
      }
    };
    const interval = window.setInterval(beat, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', beatWhenHidden);
    window.addEventListener('pagehide', beat);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', beatWhenHidden);
      window.removeEventListener('pagehide', beat);
    };
  }, [dispatch, isRunning]);
}
