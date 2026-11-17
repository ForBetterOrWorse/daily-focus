export type DayKey = string;
export type Completion = 'check' | 'count' | 'time';
export type TimerStyle = 'sessions' | 'free';
export type Phase = 'focus' | 'break' | 'long-break';

export interface AppData {
  version: 1;
  items: Item[];
  order: { habits: string[]; tasks: string[] };
  sessions: Session[];
  marks: DayMark[];
  skips: DayKey[];
  clocks: Record<string, ItemClock>;
  run: Run | null;
  cardItemId: string | null;
  settings: Settings;
  meta: Meta;
  tombstones: Record<string, number>;
}

export interface ItemBase {
  id: string;
  name: string;
  completion: Completion;
  goals: { from: DayKey; target: number }[];
  timerStyle?: TimerStyle;
  createdAt: number;
  updatedAt: number;
}

export interface HabitItem extends ItemBase {
  kind: 'habit';
  days: number[];
}

export interface TaskItem extends ItemBase {
  kind: 'task';
}

export interface QuickItem extends ItemBase {
  kind: 'quick';
  name: string;
  completion: 'time';
  goals: [];
  timerStyle: TimerStyle;
  number: number;
  day: DayKey;
}

export type Item = HabitItem | TaskItem | QuickItem;
export type ItemKind = Item['kind'];

export interface Session {
  id: string;
  itemId: string;
  day: DayKey;
  startedAt: number;
  durationMs: number;
}

export interface DayMark {
  itemId: string;
  day: DayKey;
  count: number;
  done: boolean;
  updatedAt: number;
}

export interface ItemClock {
  style: TimerStyle;
  phase: Phase;
  round: 1 | 2 | 3 | 4;
  elapsedMs: number;
  day: DayKey;
}

export interface Run {
  itemId: string;
  startedAt: number;
  clock: ItemClock;
}

export interface Settings {
  dayStartHour: number;
  weekStart: 'monday' | 'sunday';
  skipsPerMonth: number;
  updatedAt: number;
}

export interface Meta {
  firstUseAt: number;
  lastExportAt: number | null;
  bannerDismissedAt: number | null;
  autoStop: { itemId: string; at: number } | null;
  columnsOpen: boolean | null;
  quickStyle: TimerStyle;
  lastQuickNumber: { day: DayKey; number: number } | null;
}
