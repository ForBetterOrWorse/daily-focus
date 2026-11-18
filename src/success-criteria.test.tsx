import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { buildGrid, streak as streakLength } from './domain/activity';
import { exportJson, importPreview } from './domain/backup';
import { dayKeyOf } from './domain/days';
import { goalOn } from './domain/items';
import type { Action } from './domain/reduce';
import type { AppData } from './domain/types';
import { createStore, STORAGE_KEY, type AppStore } from './store/store';
import { AppDataProvider } from './store/use-app-data';
import { downloadText } from './utils/download';

vi.mock('./utils/download');

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const NOV_16 = new Date(2026, 10, 16, 9, 0, 0).getTime();
const NOV_17 = new Date(2026, 10, 17, 9, 0, 0).getTime();
const NOV_18 = new Date(2026, 10, 18, 9, 0, 0).getTime();
const NOV_18_KEY = '2026-11-18';

type User = ReturnType<typeof userEvent.setup>;

interface RenderOptions {
  storage?: Storage;
  now?: number;
  path?: string;
  wide?: boolean;
}

const stores: AppStore[] = [];
let mountedStore: AppStore | null = null;
let unmountApp: () => void = () => {};
const originalMatchMedia = window.matchMedia;

function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => {
      entries.delete(key);
    },
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
}

function mockViewport(wide: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: wide && query === '(min-width: 1024px)',
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

function mountApp(store: AppStore, path: string) {
  window.history.replaceState({}, '', path);
  const view = render(
    <AppDataProvider store={store}>
      <App />
    </AppDataProvider>
  );
  mountedStore = store;
  unmountApp = view.unmount;
}

function launchApp({
  storage = createMemoryStorage(),
  now,
  path = '/',
  wide = false,
}: RenderOptions = {}) {
  if (now !== undefined) {
    vi.setSystemTime(now);
  }
  mockViewport(wide);
  const store = createStore({ storage, now: Date.now });
  stores.push(store);
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  mountApp(store, path);
  return { store, storage, user, unmount: () => unmountApp() };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function travelTo(timestamp: number) {
  act(() => {
    vi.setSystemTime(timestamp);
  });
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50);
  });
}

function dispatch(store: AppStore, action: Action) {
  act(() => store.dispatch(action));
}

function savedData(storage: Storage): AppData {
  return JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null') as AppData;
}

function trackedMs(data: AppData, itemId?: string): number {
  return data.sessions
    .filter((session) => itemId === undefined || session.itemId === itemId)
    .reduce((total, session) => total + session.durationMs, 0);
}

function itemNamed(store: AppStore, name: string) {
  const item = store.getState().data.items.find((candidate) => candidate.name === name);
  if (!item) {
    throw new Error(`No item named ${name}`);
  }
  return item;
}

function pinOnCard(store: AppStore, name: string) {
  const { data } = store.getState();
  dispatch(store, {
    type: 'restore',
    snapshot: { ...data, cardItemId: itemNamed(store, name).id },
  });
}

function track(store: AppStore, itemId: string, minutes: number) {
  dispatch(store, { type: 'start', itemId });
  advance(minutes * MINUTE);
  dispatch(store, { type: 'pause' });
}

const MONTH_DAYS: Record<string, string> = {
  'November 15': '2026-11-15',
  'November 17': '2026-11-17',
  'November 18': '2026-11-18',
};

function gridCell(monthDay: string) {
  const cell = screen
    .getAllByRole('button', { name: new RegExp(`^${monthDay}:`) })
    .find((candidate) => candidate.getAttribute('data-day') === MONTH_DAYS[monthDay]);
  if (!cell) {
    throw new Error(`No grid cell for ${monthDay}`);
  }
  return cell;
}

function expectCell(monthDay: string, activities: number, level: number) {
  const label = `${monthDay}: ${activities} ${activities === 1 ? 'activity' : 'activities'}`;
  expect(gridCell(monthDay)).toHaveAccessibleName(label);
  expect(gridCell(monthDay)).toHaveAttribute('data-level', String(level));
}

const PAGE_PATHS = { Today: '/', Stats: '/stats', Settings: '/settings' };

/** The navbar links are plain anchors, so following one loads the page again on the same store. */
async function goTo(page: keyof typeof PAGE_PATHS) {
  if (mountedStore === null) {
    throw new Error('Render the app first');
  }
  await screen.findByRole('link', { name: page });
  unmountApp();
  mountApp(mountedStore, PAGE_PATHS[page]);
}

async function addTimeItem(user: User, kind: 'task' | 'habit', name: string, minutes: number) {
  await user.click(screen.getByRole('button', { name: `New ${kind}` }));
  const drawer = screen.getByRole('dialog', { name: `New ${kind}` });
  await user.type(within(drawer).getByRole('textbox', { name: 'Name' }), name);
  await user.click(within(drawer).getByRole('radio', { name: 'Reach a time' }));
  const minutesInput = within(drawer).getByRole('spinbutton', { name: 'Minutes' });
  await user.clear(minutesInput);
  await user.type(minutesInput, String(minutes));
  await user.click(within(drawer).getByRole('button', { name: `Add ${kind}` }));
  fireEvent.animationEnd(drawer);
  advance(1000);
}

function lastDownload(type: string) {
  const call = vi
    .mocked(downloadText)
    .mock.calls.filter(([, , mime]) => mime === type)
    .pop();
  if (!call) {
    throw new Error(`No ${type} download`);
  }
  return { fileName: call[0], text: call[1] };
}

const sources = import.meta.glob<string>(
  ['./**/*.{ts,tsx,css,json,md,html,svg}', '!./success-criteria.test.tsx'],
  { query: '?raw', import: 'default', eager: true }
);
const BANNED_PHRASE = ['Pomo', 'doro'].join('');

beforeEach(() => {
  vi.useFakeTimers({ now: NOV_18 });
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime });
  vi.mocked(downloadText).mockClear();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  unmountApp();
  stores.splice(0).forEach((store) => store.destroy());
  window.matchMedia = originalMatchMedia;
  window.history.replaceState({}, '', '/');
  Reflect.deleteProperty(document, 'visibilityState');
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('success criteria', () => {
  it('should let a first visit start timing with one press and no habit or task', async () => {
    const { user, storage } = launchApp();
    expect(savedData(storage)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Start' }));

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    const data = savedData(storage);
    expect(data.run).not.toBeNull();
    expect(data.items.map((item) => item.kind)).toEqual(['quick']);
  });

  describe('the first playable moment', () => {
    it('should fill the square with a 10-minute Work task, then darken it with a Read 30 min habit and read a streak of 1', async () => {
      const { user, store } = launchApp();

      await addTimeItem(user, 'task', 'Write report', 10);
      expect(itemNamed(store, 'Write report')).toMatchObject({ kind: 'task' });

      pinOnCard(store, 'Write report');
      await user.click(screen.getByRole('button', { name: 'Start' }));
      advance(5 * MINUTE);
      await user.click(screen.getByRole('button', { name: 'Pause' }));
      await user.click(screen.getByRole('button', { name: 'Resume' }));
      advance(5 * MINUTE);
      await user.click(screen.getByRole('button', { name: 'Mark done' }));

      expect(screen.getByRole('button', { name: /^Write report, done/ })).toBeInTheDocument();
      await goTo('Stats');
      expectCell('November 18', 1, 1);

      await goTo('Today');
      await addTimeItem(user, 'habit', 'Read', 30);
      pinOnCard(store, 'Read');
      await user.click(screen.getByRole('button', { name: 'Start' }));
      advance(25 * MINUTE + 100);
      await user.click(screen.getByRole('button', { name: 'Start' }));
      advance(5 * MINUTE + 100);
      await user.click(screen.getByRole('button', { name: 'Start' }));
      advance(5 * MINUTE);
      await user.click(screen.getByRole('button', { name: 'Pause' }));

      expect(screen.getByRole('button', { name: /^Read, done/ })).toBeInTheDocument();
      expect(screen.getByText('1-day streak')).toBeInTheDocument();
      await goTo('Stats');
      expectCell('November 18', 2, 2);
    });

    it('should keep a paused named quick session standalone without offering to add it to tasks', async () => {
      const { user, store, storage } = launchApp();

      await user.click(screen.getByRole('button', { name: 'Start' }));
      await user.type(screen.getByRole('textbox', { name: 'Session name' }), 'Sketch ideas');
      advance(3 * MINUTE);
      await user.click(screen.getByRole('button', { name: 'Pause' }));

      const session = itemNamed(store, 'Sketch ideas');
      expect(session.kind).toBe('quick');
      expect(trackedMs(savedData(storage), session.id)).toBe(3 * MINUTE);
      expect(screen.queryByRole('button', { name: 'Add to tasks' })).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveValue('Sketch ideas');
    });
  });

  it('should keep tracked time within 1 second after a reload', async () => {
    const { storage, user, unmount } = launchApp();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(5 * MINUTE);
    unmount();
    travelTo(Date.now() + 600);

    const { user: reloadedUser } = launchApp({ storage });
    expect(screen.getByText('5:00')).toBeInTheDocument();
    await reloadedUser.click(screen.getByRole('button', { name: 'Pause' }));

    const total = trackedMs(savedData(storage));
    expect(Math.abs(total - (5 * MINUTE + 600))).toBeLessThanOrEqual(1000);
  });

  it('should keep tracked time within 1 second after 30 minutes in the background', async () => {
    const { user, storage } = launchApp();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    advance(30 * MINUTE);
    Reflect.deleteProperty(document, 'visibilityState');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    advance(1000);
    expect(screen.getByText('30:01')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pause' }));

    const total = trackedMs(savedData(storage));
    expect(Math.abs(total - (30 * MINUTE + 1000))).toBeLessThanOrEqual(1000);
  });

  it('should save only the time before the tab closed when a free run is reopened much later', async () => {
    const { storage, user, unmount } = launchApp();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(10 * MINUTE);
    unmount();
    travelTo(Date.now() + 13 * HOUR);

    launchApp({ storage: storage });

    const data = savedData(storage);
    expect(data.run).toBeNull();
    expect(data.meta.autoStop).toBeNull();
    expect(Math.abs(trackedMs(data) - 10 * MINUTE)).toBeLessThanOrEqual(30 * 1000);
  });

  it('should stop a timer left running at exactly 12 hours and show the notice on the next visit', async () => {
    const { storage, user, unmount } = launchApp();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    unmount();
    travelTo(Date.now() + 13 * HOUR);
    const openApp = savedData(storage);
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...openApp, run: { ...openApp.run!, lastSeenAt: Date.now() - MINUTE } })
    );

    launchApp({ storage: storage });

    expect(
      screen.getByText('Session 1 ran for 12 hours, so it stopped and saved 12 h.')
    ).toBeInTheDocument();
    const data = savedData(storage);
    expect(data.run).toBeNull();
    expect(data.sessions.map((session) => session.durationMs)).toEqual([12 * HOUR]);
  });

  it('should empty the square and update the streak when the only item logged on a day is deleted', async () => {
    const { user, store } = launchApp({ now: NOV_17 });
    await user.click(screen.getByRole('button', { name: 'Walk' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    dispatch(store, {
      type: 'addItem',
      item: { kind: 'habit', name: 'Journal', completion: 'check' },
    });
    await user.click(screen.getByRole('button', { name: /^Walk\. Check off/ }));
    await user.click(screen.getByRole('button', { name: /^Journal\. Check off/ }));
    travelTo(NOV_18);
    advance(1000);
    await user.click(screen.getByRole('button', { name: /^Walk\. Check off/ }));
    expect(screen.getByText('2-day streak')).toBeInTheDocument();
    await goTo('Stats');
    expectCell('November 18', 1, 1);

    await goTo('Today');
    await user.click(screen.getByRole('button', { name: 'Edit habits' }));
    await user.click(screen.getByRole('button', { name: 'Delete Walk' }));
    await user.click(
      within(screen.getByRole('dialog', { name: /^Delete Walk/ })).getByRole('button', {
        name: 'Delete',
      })
    );
    advance(1000);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    advance(1000);

    expect(screen.getByText('1-day streak')).toBeInTheDocument();
    await goTo('Stats');
    expectCell('November 18', 0, 0);
  });

  it('should count earlier met days as met after a habit goal is raised', async () => {
    const { user, store } = launchApp({ now: NOV_17 });
    dispatch(store, {
      type: 'addItem',
      item: {
        kind: 'habit',
        name: 'Read',
        completion: 'time',
        target: 30,
        timerStyle: 'free',
      },
    });
    track(store, itemNamed(store, 'Read').id, 30);
    travelTo(NOV_18);
    advance(1000);

    await user.click(screen.getByRole('button', { name: 'Edit habits' }));
    await user.click(screen.getByRole('button', { name: 'Edit Read' }));
    const minutes = screen.getByRole('spinbutton', { name: 'Minutes' });
    await user.clear(minutes);
    await user.type(minutes, '60');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    advance(1000);

    const read = itemNamed(store, 'Read');
    expect(goalOn(read, '2026-11-17')).toBe(30);
    expect(goalOn(read, NOV_18_KEY)).toBe(60);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    advance(1000);
    expect(screen.getByText('1-day streak')).toBeInTheDocument();
    await goTo('Stats');
    expectCell('November 17', 1, 1);
  });

  it('should restore the same data, grid, and streak from an export imported with Replace', async () => {
    const {
      store,
      user: sourceUser,
      unmount: unmountSource,
    } = launchApp({
      now: NOV_17,
      path: '/settings',
    });
    const add = (item: Extract<Action, { type: 'addItem' }>['item']) =>
      dispatch(store, { type: 'addItem', item });
    add({ kind: 'habit', name: 'Walk', completion: 'check' });
    add({
      kind: 'habit',
      name: 'Read',
      completion: 'time',
      target: 30,
      timerStyle: 'free',
    });
    add({ kind: 'task', name: 'Draft', completion: 'time', target: 20 });
    dispatch(store, { type: 'tapItem', itemId: itemNamed(store, 'Walk').id });
    track(store, itemNamed(store, 'Read').id, 30);
    dispatch(store, { type: 'newQuickSession', start: true, name: 'Scratch' });
    advance(12 * MINUTE);
    dispatch(store, { type: 'pause' });
    travelTo(NOV_18);
    advance(1000);
    track(store, itemNamed(store, 'Draft').id, 20);
    dispatch(store, { type: 'updateSettings', patch: { weekStart: 'sunday', skipsPerMonth: 3 } });

    await sourceUser.click(screen.getByRole('button', { name: 'Export backup' }));
    const original = store.getState().data;
    const { text } = lastDownload('application/json');
    unmountSource();

    const { store: targetStore, user: targetUser } = launchApp({ path: '/settings' });
    await targetUser.upload(
      screen.getByLabelText('Backup file'),
      new File([text], 'daily-focus-2026-11-18.json', { type: 'application/json' })
    );
    await flush();
    await targetUser.click(screen.getByRole('radio', { name: /Replace/ }));
    await targetUser.click(
      screen.getByRole('checkbox', { name: "Export this browser's data first" })
    );
    await targetUser.click(screen.getByRole('button', { name: 'Replace data' }));

    const restored = targetStore.getState().data;
    expect(restored.items.map((item) => item.kind).sort()).toEqual([
      'habit',
      'habit',
      'quick',
      'task',
    ]);
    expect(restored.items).toEqual(original.items);
    expect(restored.sessions).toEqual(original.sessions);
    expect(restored.marks).toEqual(original.marks);
    expect(restored.settings).toEqual(original.settings);
    expect(buildGrid(restored, NOV_18_KEY, 'sunday')).toEqual(
      buildGrid(original, NOV_18_KEY, 'sunday')
    );
    expect(streakLength(restored, NOV_18_KEY)).toBe(streakLength(original, NOV_18_KEY));
    await goTo('Today');
    expect(screen.getByText('2-day streak')).toBeInTheDocument();
    await goTo('Stats');
    expectCell('November 18', 1, 1);
    expectCell('November 17', 3, 2);
  });

  it('should merge two devices without losing a session and keep a shared quick session once', () => {
    let clock = NOV_17;
    const deviceA = createStore({ storage: createMemoryStorage(), now: () => clock });
    const deviceB = createStore({ storage: createMemoryStorage(), now: () => clock });
    stores.push(deviceA, deviceB);

    deviceA.dispatch({ type: 'newQuickSession', start: true, name: 'Shared' });
    clock += 15 * MINUTE;
    deviceA.dispatch({ type: 'pause' });
    const firstExport = importPreview(JSON.parse(exportJson(deviceA.getState().data, clock).text));
    if (!firstExport.ok) {
      throw new Error('The first export did not parse');
    }
    deviceB.dispatch({ type: 'importData', mode: 'replace', incoming: firstExport.data });

    deviceB.dispatch({
      type: 'addItem',
      item: { kind: 'task', name: 'Plan', completion: 'time', target: 20 },
    });
    deviceB.dispatch({ type: 'start', itemId: itemNamed(deviceB, 'Plan').id });
    clock += 10 * MINUTE;
    deviceB.dispatch({ type: 'pause' });
    deviceA.dispatch({
      type: 'addItem',
      item: { kind: 'habit', name: 'Read', completion: 'time', target: 30 },
    });
    deviceA.dispatch({ type: 'start', itemId: itemNamed(deviceA, 'Read').id });
    clock += 20 * MINUTE;
    deviceA.dispatch({ type: 'pause' });

    const incoming = importPreview(JSON.parse(exportJson(deviceB.getState().data, clock).text));
    if (!incoming.ok) {
      throw new Error('The second export did not parse');
    }
    const sessionIdsBefore = [
      ...deviceA.getState().data.sessions,
      ...deviceB.getState().data.sessions,
    ].map((session) => session.id);
    deviceA.dispatch({ type: 'importData', mode: 'merge', incoming: incoming.data });

    const merged = deviceA.getState().data;
    expect(new Set(merged.sessions.map((session) => session.id))).toEqual(
      new Set(sessionIdsBefore)
    );
    expect(merged.sessions).toHaveLength(3);
    expect(merged.items.filter((item) => item.name === 'Shared')).toHaveLength(1);
  });

  it('should show standalone sessions separately from tasks and habits in Stats', async () => {
    const { store } = launchApp({ path: '/stats' });
    dispatch(store, { type: 'newQuickSession', start: true });
    advance(12 * MINUTE);
    dispatch(store, { type: 'newQuickSession', start: true });
    advance(12 * MINUTE);
    dispatch(store, { type: 'pause' });

    const standalone = screen.getByRole('table', { name: 'Standalone sessions' });
    expect(within(standalone).getAllByRole('rowheader')).toHaveLength(2);
    expect(within(standalone).getByRole('rowheader', { name: 'Session 1' })).toBeVisible();
    expect(within(standalone).getByRole('rowheader', { name: 'Session 2' })).toBeVisible();
    expect(screen.getByText('No task or habit time tracked in this range.')).toBeVisible();
    expectCell('November 18', 2, 2);
  });

  it('should fill the square for a quick session of 10 minutes or more', async () => {
    const { user } = launchApp();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(9 * MINUTE);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await goTo('Stats');
    expect(gridCell('November 18')).toHaveAttribute('data-level', '0');

    await goTo('Today');
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    advance(MINUTE);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await goTo('Stats');

    expect(gridCell('November 18')).toHaveAttribute('data-level', '1');
    expectCell('November 18', 1, 1);
  });

  it('should keep every minute tracked so far when a running quick session switches timer style', async () => {
    const { user, storage } = launchApp();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(5 * MINUTE);

    await user.click(screen.getByRole('radio', { name: 'Focus sessions' }));

    let data = savedData(storage);
    expect(trackedMs(data)).toBe(5 * MINUTE);
    expect(data.run?.clock.style).toBe('sessions');
    advance(MINUTE);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    data = savedData(storage);
    expect(trackedMs(data)).toBe(6 * MINUTE);
  });

  it('should show Habits and Tasks under the focus card with no control to hide them below 1024px', async () => {
    const { user } = launchApp({ wide: false });

    const timer = screen.getByRole('region', { name: 'Timer' });
    const habits = screen.getByRole('heading', { name: 'Habits' });
    const tasks = screen.getByRole('heading', { name: 'Tasks' });
    expect(habits).toBeVisible();
    expect(tasks).toBeVisible();
    expect(timer.compareDocumentPosition(habits) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add habits and tasks' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Habits and tasks' })).not.toHaveAttribute(
      'aria-expanded'
    );

    await user.keyboard('\\');

    expect(habits).toBeVisible();
    expect(tasks).toBeVisible();
  });

  it('should keep the streak alive with a skip on an empty past day and return the skip when that day gets activity', async () => {
    const { user, store } = launchApp({ now: NOV_16 });
    dispatch(store, {
      type: 'addItem',
      item: { kind: 'habit', name: 'Walk', completion: 'check' },
    });
    const walkId = itemNamed(store, 'Walk').id;
    dispatch(store, { type: 'tapItem', itemId: walkId });
    travelTo(NOV_18);
    advance(1000);
    dispatch(store, { type: 'tapItem', itemId: walkId });
    expect(screen.getByText('1-day streak')).toBeInTheDocument();

    await goTo('Stats');
    await user.click(gridCell('November 17'));
    await user.click(screen.getByRole('button', { name: /^Use a skip/ }));
    await goTo('Today');
    expect(screen.getByText('2-day streak')).toBeInTheDocument();

    await goTo('Stats');
    await user.click(gridCell('November 15'));
    expect(screen.queryByRole('button', { name: /Use a skip/ })).toBeNull();

    travelTo(new Date(2026, 10, 17, 12, 0, 0).getTime());
    dispatch(store, { type: 'tapItem', itemId: walkId });
    travelTo(NOV_18);

    expectCell('November 17', 1, 1);
    expect(screen.queryByRole('button', { name: /Use a skip/ })).toBeNull();
    expect(dayKeyOf(Date.now(), 0)).toBe(NOV_18_KEY);
  });

  it('should not show the banned technique name on any route or anywhere in src', () => {
    const phrase = new RegExp(BANNED_PHRASE, 'i');

    for (const path of ['/', '/stats', '/settings']) {
      const { store, unmount } = launchApp({ path });
      dispatch(store, { type: 'newQuickSession', start: true, name: 'Draft' });
      dispatch(store, { type: 'pause' });
      expect(document.body.innerHTML).not.toMatch(phrase);
      expect(document.title).not.toMatch(phrase);
      unmount();
    }

    const files = Object.entries(sources);
    expect(files.length).toBeGreaterThan(100);
    expect(
      files
        .filter(([, content]) => typeof content === 'string' && phrase.test(content))
        .map(([file]) => file)
    ).toEqual([]);
  });

});
