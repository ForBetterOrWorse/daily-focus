import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { Action } from '../domain/reduce';
import type { PhaseEnd } from '../domain/phase-end';
import type { AppData } from '../domain/types';
import type { AppStore, StoreState } from './store';

const AppStoreContext = createContext<AppStore | null>(null);

interface AppDataProviderProps {
  store: AppStore;
  children: ReactNode;
}

function useStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (store === null) {
    throw new Error('AppDataProvider is missing');
  }

  return store;
}

function useStoreState<T>(selector: (state: StoreState) => T): T {
  const store = useStore();
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return selector(state);
}

export function AppDataProvider({ store, children }: AppDataProviderProps) {
  return createElement(AppStoreContext.Provider, { value: store }, children);
}

export function useAppData<T>(selector: (data: AppData) => T): T {
  return useStoreState((state) => selector(state.data));
}

export function useAppError(): string | null {
  return useStoreState((state) => state.error);
}

export function useLastAction(): Action | null {
  return useStoreState((state) => state.lastAction);
}

export function useDispatch(): (action: Action) => void {
  return useStore().dispatch;
}

export function useTakeMissedPhaseEnd(): () => PhaseEnd | null {
  return useStore().takeMissedPhaseEnd;
}

export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      throw new RangeError('intervalMs must be a positive finite number');
    }

    const interval = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs]);

  return now;
}
