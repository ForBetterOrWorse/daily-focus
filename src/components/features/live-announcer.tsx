import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from './live-announcer.module.css';

const LiveAnnouncerContext = createContext<((message: string) => void) | null>(null);

export function LiveAnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<number | null>(null);

  const announce = useCallback((nextMessage: string) => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    setMessage('');
    timeoutRef.current = window.setTimeout(() => {
      setMessage(nextMessage);
      timeoutRef.current = null;
    }, 100);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  return (
    <LiveAnnouncerContext.Provider value={announce}>
      {children}
      <div className={styles.region} role="status" aria-live="polite" aria-atomic="true">
        {message}
      </div>
    </LiveAnnouncerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook belongs with its provider.
export function useAnnounce(): (message: string) => void {
  const announce = useContext(LiveAnnouncerContext);
  if (!announce) {
    throw new Error('useAnnounce must be called inside a LiveAnnouncerProvider.');
  }
  return announce;
}
