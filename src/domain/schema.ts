import { MAX_STORED_COUNT_GOAL, maxGoal, minGoal } from './items';
import { MAX_SKIPS_PER_MONTH } from './settings';
import type {
  AppData,
  Completion,
  DayKey,
  DayMark,
  Group,
  HabitItem,
  Item,
  ItemClock,
  Meta,
  Phase,
  QuickItem,
  Run,
  Session,
  Settings,
  TaskItem,
  TimerStyle,
} from './types';

const DEFAULT_GROUPS = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Work' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Health' },
  { id: '00000000-0000-4000-8000-000000000003', name: 'Learning' },
  { id: '00000000-0000-4000-8000-000000000004', name: 'Chores' },
  { id: '00000000-0000-4000-8000-000000000005', name: 'Hobby' },
] as const;

type DataObject = Record<string, unknown>;

export class InvalidDataError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'InvalidDataError';
  }
}

function invalid(path: string, reason: string): never {
  throw new InvalidDataError(`${path}: ${reason}`);
}

function objectAt(value: unknown, path: string): DataObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalid(path, 'expected an object');
  }

  return value as DataObject;
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return invalid(path, 'expected a non-empty string');
  }

  return value;
}

function nullableStringAt(value: unknown, path: string): string | null {
  return value === null ? null : stringAt(value, path);
}

function nameAt(value: unknown, path: string, allowEmpty: boolean): string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) {
    return invalid(path, allowEmpty ? 'expected a string' : 'expected a non-empty string');
  }

  return value;
}

function numberAt(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return invalid(path, 'expected a finite non-negative number');
  }

  return value;
}

function integerAt(value: unknown, path: string): number {
  const number = numberAt(value, path);
  if (!Number.isInteger(number)) {
    return invalid(path, 'expected a non-negative integer');
  }

  return number;
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    return invalid(path, 'expected a boolean');
  }

  return value;
}

function nullableBooleanAt(value: unknown, path: string): boolean | null {
  return value === null ? null : booleanAt(value, path);
}

function dayKeyAt(value: unknown, path: string): DayKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return invalid(path, 'expected a YYYY-MM-DD date');
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return invalid(path, 'expected a valid calendar date');
  }

  return value;
}

function arrayAt<T>(value: unknown, path: string, parse: (value: unknown, path: string) => T): T[] {
  if (!Array.isArray(value)) {
    return invalid(path, 'expected an array');
  }

  return value.map((entry, index) => parse(entry, `${path}[${index}]`));
}

function enumAt<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (typeof value !== 'string') {
    return invalid(path, `expected one of ${allowed.join(', ')}`);
  }

  const match = allowed.find((entry) => entry === value);
  if (match === undefined) {
    return invalid(path, `expected one of ${allowed.join(', ')}`);
  }

  return match;
}

function nullableNumberAt(value: unknown, path: string): number | null {
  return value === null ? null : numberAt(value, path);
}

function parseGroup(value: unknown, path: string): Group {
  const group = objectAt(value, path);
  return {
    id: stringAt(group.id, `${path}.id`),
    name: stringAt(group.name, `${path}.name`),
    updatedAt: numberAt(group.updatedAt, `${path}.updatedAt`),
  };
}

function parseGoal(value: unknown, path: string, completion: Completion): Item['goals'][number] {
  const goal = objectAt(value, path);
  const target = numberAt(goal.target, `${path}.target`);
  if (completion !== 'check') {
    const min = minGoal(completion);
    const max = completion === 'count' ? MAX_STORED_COUNT_GOAL : maxGoal(completion);
    if (target < min || target > max || (completion === 'count' && !Number.isInteger(target))) {
      return invalid(`${path}.target`, `expected a number from ${min} to ${max}`);
    }
  }

  return {
    from: dayKeyAt(goal.from, `${path}.from`),
    target,
  };
}

function parseDays(value: unknown, path: string): number[] {
  return arrayAt(value, path, (day, dayPath) => {
    const weekday = integerAt(day, dayPath);
    if (weekday > 6) {
      return invalid(dayPath, 'weekday must be between 0 and 6');
    }

    return weekday;
  });
}

function parseItem(value: unknown, path: string): Item {
  const item = objectAt(value, path);
  const kind = enumAt(item.kind, ['habit', 'task', 'quick'], `${path}.kind`);
  const completion = enumAt<Completion>(
    item.completion,
    ['check', 'count', 'time'],
    `${path}.completion`
  );
  const goals = arrayAt(item.goals, `${path}.goals`, (goal, goalPath) =>
    parseGoal(goal, goalPath, completion)
  );
  if (kind === 'quick') {
    if (completion !== 'time') {
      return invalid(`${path}.completion`, 'quick items must use time completion');
    }
    if (goals.length > 0) {
      return invalid(`${path}.goals`, 'quick items must have no goals');
    }
  } else if ((completion === 'check') !== (goals.length === 0)) {
    return invalid(
      `${path}.goals`,
      'check items must have no goals; count and time items need a goal'
    );
  }

  const timerStyle =
    item.timerStyle === undefined
      ? undefined
      : enumAt<TimerStyle>(item.timerStyle, ['sessions', 'free'], `${path}.timerStyle`);
  if (timerStyle !== undefined && completion !== 'time') {
    return invalid(`${path}.timerStyle`, 'only time items can have a timer style');
  }

  const base = {
    id: stringAt(item.id, `${path}.id`),
    name: nameAt(item.name, `${path}.name`, kind === 'quick'),
    groupId: item.groupId === null ? null : stringAt(item.groupId, `${path}.groupId`),
    completion,
    goals,
    ...(timerStyle === undefined ? {} : { timerStyle }),
    createdAt: numberAt(item.createdAt, `${path}.createdAt`),
    updatedAt: numberAt(item.updatedAt, `${path}.updatedAt`),
  };

  if (kind === 'quick') {
    if (item.groupId !== null) {
      return invalid(`${path}.groupId`, 'quick items must not belong to a group');
    }
    if (goals.length !== 0) {
      return invalid(`${path}.goals`, 'quick items must have no goals');
    }
    if (timerStyle === undefined) {
      return invalid(`${path}.timerStyle`, 'quick items need a timer style');
    }

    const number = integerAt(item.number, `${path}.number`);
    if (number === 0) {
      return invalid(`${path}.number`, 'expected a positive integer');
    }

    const quickItem: QuickItem = {
      ...base,
      kind,
      completion: 'time',
      goals: [],
      groupId: null,
      timerStyle,
      number,
      day: dayKeyAt(item.day, `${path}.day`),
    };
    return quickItem;
  }

  if (kind === 'habit') {
    const habitItem: HabitItem = {
      ...base,
      kind,
      days: parseDays(item.days, `${path}.days`),
    };
    return habitItem;
  }

  const taskItem: TaskItem = { ...base, kind };
  return taskItem;
}

function parseSession(value: unknown, path: string): Session {
  const session = objectAt(value, path);
  return {
    id: stringAt(session.id, `${path}.id`),
    itemId: stringAt(session.itemId, `${path}.itemId`),
    day: dayKeyAt(session.day, `${path}.day`),
    startedAt: numberAt(session.startedAt, `${path}.startedAt`),
    durationMs: numberAt(session.durationMs, `${path}.durationMs`),
  };
}

function parseMark(value: unknown, path: string): DayMark {
  const mark = objectAt(value, path);
  return {
    itemId: stringAt(mark.itemId, `${path}.itemId`),
    day: dayKeyAt(mark.day, `${path}.day`),
    count: integerAt(mark.count, `${path}.count`),
    done: booleanAt(mark.done, `${path}.done`),
    updatedAt: numberAt(mark.updatedAt, `${path}.updatedAt`),
  };
}

function parseClock(value: unknown, path: string): ItemClock {
  const clock = objectAt(value, path);
  const round = integerAt(clock.round, `${path}.round`);
  if (round < 1 || round > 4) {
    return invalid(`${path}.round`, 'must be between 1 and 4');
  }

  return {
    style: enumAt<TimerStyle>(clock.style, ['sessions', 'free'], `${path}.style`),
    phase: enumAt<Phase>(clock.phase, ['focus', 'break', 'long-break'], `${path}.phase`),
    round: round as ItemClock['round'],
    elapsedMs: numberAt(clock.elapsedMs, `${path}.elapsedMs`),
    day: dayKeyAt(clock.day, `${path}.day`),
  };
}

function parseRun(value: unknown, path: string): Run | null {
  if (value === null) {
    return null;
  }

  const run = objectAt(value, path);
  return {
    itemId: stringAt(run.itemId, `${path}.itemId`),
    startedAt: numberAt(run.startedAt, `${path}.startedAt`),
    clock: parseClock(run.clock, `${path}.clock`),
  };
}

function parseSettings(value: unknown, path: string): Settings {
  const settings = objectAt(value, path);
  const dayStartHour = integerAt(settings.dayStartHour, `${path}.dayStartHour`);
  if (dayStartHour > 23) {
    return invalid(`${path}.dayStartHour`, 'must be between 0 and 23');
  }

  return {
    dayStartHour,
    weekStart: enumAt(settings.weekStart, ['monday', 'sunday'], `${path}.weekStart`),
    skipsPerMonth: Math.min(
      MAX_SKIPS_PER_MONTH,
      integerAt(settings.skipsPerMonth, `${path}.skipsPerMonth`)
    ),
    updatedAt: numberAt(settings.updatedAt, `${path}.updatedAt`),
  };
}

function parseMeta(value: unknown, path: string): Meta {
  const meta = objectAt(value, path);
  const autoStop =
    meta.autoStop === null
      ? null
      : (() => {
          const stop = objectAt(meta.autoStop, `${path}.autoStop`);
          return {
            itemId: stringAt(stop.itemId, `${path}.autoStop.itemId`),
            at: numberAt(stop.at, `${path}.autoStop.at`),
          };
        })();
  const lastQuickNumber =
    meta.lastQuickNumber === null
      ? null
      : (() => {
          const last = objectAt(meta.lastQuickNumber, `${path}.lastQuickNumber`);
          const number = integerAt(last.number, `${path}.lastQuickNumber.number`);
          if (number === 0) {
            return invalid(`${path}.lastQuickNumber.number`, 'expected a positive integer');
          }

          return {
            day: dayKeyAt(last.day, `${path}.lastQuickNumber.day`),
            number,
          };
        })();

  return {
    firstUseAt: numberAt(meta.firstUseAt, `${path}.firstUseAt`),
    lastExportAt: nullableNumberAt(meta.lastExportAt, `${path}.lastExportAt`),
    bannerDismissedAt: nullableNumberAt(meta.bannerDismissedAt, `${path}.bannerDismissedAt`),
    autoStop,
    columnsOpen: nullableBooleanAt(meta.columnsOpen, `${path}.columnsOpen`),
    quickStyle: enumAt<TimerStyle>(meta.quickStyle, ['sessions', 'free'], `${path}.quickStyle`),
    lastQuickNumber,
  };
}

function stringArrayAt(value: unknown, path: string): string[] {
  return arrayAt(value, path, stringAt);
}

function numberRecordAt(value: unknown, path: string): Record<string, number> {
  const record = objectAt(value, path);
  const result = Object.create(null) as Record<string, number>;
  for (const [key, entry] of Object.entries(record)) {
    result[key] = numberAt(entry, `${path}.${key}`);
  }
  return result;
}

function clockRecordAt(value: unknown, path: string): Record<string, ItemClock> {
  const record = objectAt(value, path);
  const result = Object.create(null) as Record<string, ItemClock>;
  for (const [key, entry] of Object.entries(record)) {
    result[key] = parseClock(entry, `${path}.${key}`);
  }
  return result;
}

export function emptyData(now: number): AppData {
  return {
    version: 1,
    groups: DEFAULT_GROUPS.map(({ id, name }) => ({ id, name, updatedAt: now })),
    items: [],
    order: { habits: [], tasks: [] },
    sessions: [],
    marks: [],
    skips: [],
    clocks: {},
    run: null,
    cardItemId: null,
    settings: {
      dayStartHour: 0,
      weekStart: 'monday',
      skipsPerMonth: 2,
      updatedAt: now,
    },
    meta: {
      firstUseAt: now,
      lastExportAt: null,
      bannerDismissedAt: null,
      autoStop: null,
      columnsOpen: null,
      quickStyle: 'free',
      lastQuickNumber: null,
    },
    tombstones: {},
  };
}

export function parseData(json: unknown): AppData {
  const data = objectAt(json, 'data');
  if (data.version !== 1) {
    return invalid('data.version', 'unsupported data version');
  }

  const order = objectAt(data.order, 'data.order');
  const items = arrayAt(data.items, 'data.items', parseItem);
  const run = parseRun(data.run, 'data.run');
  const cardItemId = nullableStringAt(data.cardItemId, 'data.cardItemId');
  const itemIds = new Set(items.map((item) => item.id));
  if (cardItemId !== null && !itemIds.has(cardItemId)) {
    return invalid('data.cardItemId', 'must reference an existing item');
  }
  if (run !== null && !itemIds.has(run.itemId)) {
    return invalid('data.run.itemId', 'must reference an existing item');
  }

  return {
    version: 1,
    groups: arrayAt(data.groups, 'data.groups', parseGroup),
    items,
    order: {
      habits: stringArrayAt(order.habits, 'data.order.habits'),
      tasks: stringArrayAt(order.tasks, 'data.order.tasks'),
    },
    sessions: arrayAt(data.sessions, 'data.sessions', parseSession),
    marks: arrayAt(data.marks, 'data.marks', parseMark),
    skips: arrayAt(data.skips, 'data.skips', dayKeyAt),
    clocks: clockRecordAt(data.clocks, 'data.clocks'),
    run,
    cardItemId,
    settings: parseSettings(data.settings, 'data.settings'),
    meta: parseMeta(data.meta, 'data.meta'),
    tombstones: numberRecordAt(data.tombstones, 'data.tombstones'),
  };
}
