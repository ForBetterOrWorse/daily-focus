import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, type AppStore } from '@/store/store';
import { AppDataProvider } from '@/store/use-app-data';
import { BackupBanner } from './backup-banner';

const DAY = 86_400_000;
const START = Date.UTC(2026, 0, 1, 12);
const stores: AppStore[] = [];

function setup({
  daysSinceFirstUse,
  daysSinceExport = null,
  withItem = true,
}: {
  daysSinceFirstUse: number;
  daysSinceExport?: number | null;
  withItem?: boolean;
}) {
  vi.setSystemTime(START);
  const store = createStore({ storage: window.localStorage, now: Date.now });
  stores.push(store);
  if (withItem) {
    store.dispatch({
      type: 'addItem',
      item: { kind: 'task', name: 'Read', groupId: null, completion: 'check' },
    });
  }
  const data = store.getState().data;
  store.dispatch({
    type: 'restore',
    snapshot: {
      ...data,
      meta: {
        ...data.meta,
        firstUseAt: START - daysSinceFirstUse * DAY,
        lastExportAt: daysSinceExport === null ? null : START - daysSinceExport * DAY,
      },
    },
  });
  render(
    <AppDataProvider store={store}>
      <BackupBanner />
    </AppDataProvider>
  );
  return store;
}

const banner = () => screen.queryByRole('complementary', { name: 'Backup reminder' });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  stores.splice(0).forEach((store) => store.destroy());
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('BackupBanner', () => {
  it('should stay hidden on a first visit', () => {
    setup({ daysSinceFirstUse: 30, withItem: false });
    expect(banner()).not.toBeInTheDocument();
  });

  it('should stay hidden before 7 days', () => {
    setup({ daysSinceFirstUse: 6 });
    expect(banner()).not.toBeInTheDocument();
  });

  it('should show 7 days after first use when there was no export', () => {
    setup({ daysSinceFirstUse: 7 });
    expect(banner()).toHaveTextContent(
      'Your data lives only in this browser, and you have not backed up yet. Back up in Settings'
    );
  });

  it('should show the whole days since the last export', () => {
    setup({ daysSinceFirstUse: 30, daysSinceExport: 8 });
    expect(banner()).toHaveTextContent(
      'Your data lives only in this browser, and the last backup was 8 days ago. Back up in Settings'
    );
  });

  it('should stay hidden when exported 3 days ago even if first use was long ago', () => {
    setup({ daysSinceFirstUse: 90, daysSinceExport: 3 });
    expect(banner()).not.toBeInTheDocument();
  });

  it('should link to the Backup section of Settings', () => {
    setup({ daysSinceFirstUse: 30, daysSinceExport: 8 });
    expect(screen.getByRole('link', { name: 'Back up in Settings' })).toHaveAttribute(
      'href',
      '/settings#settings-backup'
    );
  });

  it('should hide and record the dismissal when dismissed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup({ daysSinceFirstUse: 30, daysSinceExport: 8 });
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    fireEvent.transitionEnd(screen.getByRole('complementary', { name: 'Backup reminder' }), {
      propertyName: 'opacity',
    });

    expect(banner()).not.toBeInTheDocument();
    expect(store.getState().data.meta.bannerDismissedAt).toBeGreaterThanOrEqual(START);
    expect(store.getState().data.meta.bannerDismissedAt).toBeLessThan(START + DAY);
  });

  it('should return once the gap grows by a day', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setup({ daysSinceFirstUse: 30, daysSinceExport: 8 });
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    fireEvent.transitionEnd(screen.getByRole('complementary', { name: 'Backup reminder' }), {
      propertyName: 'opacity',
    });

    await act(() => vi.advanceTimersByTimeAsync(DAY - 60_000));
    expect(banner()).not.toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(banner()).toHaveTextContent('the last backup was 9 days ago');
  });
});
