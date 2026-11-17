import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportJson } from '@/domain/backup';
import { createStore, type AppStore } from '@/store/store';
import { AppDataProvider } from '@/store/use-app-data';
import { downloadText } from '@/utils/download';
import { BackupSettings } from './backup-settings';

vi.mock('@/utils/download');

const NOW = new Date(2026, 9, 20, 12, 0, 0).getTime();
const stores: AppStore[] = [];
const NOT_A_BACKUP = "That file isn't a Daily Focus backup, so nothing changed.";

type User = ReturnType<typeof userEvent.setup>;

function backupFile(items: number, sessions: number): File {
  window.localStorage.clear();
  const source = createStore({ storage: window.localStorage, now: () => NOW });
  for (let index = 1; index <= items; index += 1) {
    source.dispatch({
      type: 'addItem',
      item: { kind: 'habit', name: `Walk ${index}`, completion: 'check' },
    });
  }
  const data = source.getState().data;
  source.destroy();
  for (let index = 1; index <= sessions; index += 1) {
    data.sessions.push({
      id: `session-${index}`,
      itemId: data.items[0]?.id ?? 'none',
      day: '2026-10-19',
      startedAt: NOW,
      durationMs: 60_000,
    });
  }
  return new File([exportJson(data, NOW).text], 'daily-focus-2026-10-20.json', {
    type: 'application/json',
  });
}

function setup() {
  window.localStorage.clear();
  const store = createStore({ storage: window.localStorage, now: () => NOW });
  stores.push(store);
  store.dispatch({
    type: 'addItem',
    item: { kind: 'habit', name: 'Read', completion: 'check' },
  });
  render(
    <AppDataProvider store={store}>
      <BackupSettings />
    </AppDataProvider>
  );
  return store;
}

describe('BackupSettings', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    vi.mocked(downloadText).mockClear();
  });

  afterEach(() => {
    stores.splice(0).forEach((store) => store.destroy());
    vi.useRealTimers();
  });

  it('should show that no backup exists yet', () => {
    setup();
    expect(screen.getByText('Last backup: never')).toBeVisible();
  });

  it('should download the JSON backup and show the backup date', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = setup();
    await user.click(screen.getByRole('button', { name: 'Export backup' }));

    expect(downloadText).toHaveBeenCalledTimes(1);
    const [fileName, text, type] = vi.mocked(downloadText).mock.calls[0];
    expect(fileName).toBe('daily-focus-2026-10-20.json');
    expect(type).toBe('application/json');
    expect(JSON.parse(text)).toMatchObject({ items: [{ name: 'Read' }] });
    expect(store.getState().data.meta.lastExportAt).toBe(NOW);
    expect(screen.getByText('Last backup: October 20')).toBeVisible();
  });

  describe('import', () => {
    function uploadInput() {
      return screen.getByLabelText('Backup file');
    }

    async function pick(user: ReturnType<typeof userEvent.setup>, file: File) {
      await user.upload(uploadInput(), file);
    }

    it('should open the dialog for a valid backup', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      setup();
      await pick(user, backupFile(11, 214));

      expect(await screen.findByRole('dialog', { name: 'Import backup' })).toBeVisible();
      expect(screen.getByText('daily-focus-2026-10-20.json')).toBeVisible();
      expect(screen.getByText('Backed up October 20 · 11 items · 214 sessions')).toBeVisible();
    });

    it('should merge the backup and report the result', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const store = setup();
      await pick(user, backupFile(2, 3));
      await user.click(await screen.findByRole('button', { name: 'Merge' }));

      expect(store.getState().data.items).toHaveLength(3);
      expect(screen.getByRole('status')).toHaveTextContent('Imported 2 items and 3 sessions.');
      expect(downloadText).not.toHaveBeenCalled();
    });

    it('should download the current data before replacing it', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const store = setup();
      await pick(user, backupFile(2, 3));
      await user.click(await screen.findByRole('radio', { name: /Replace/ }));
      expect(
        screen.getByRole('checkbox', { name: "Export this browser's data first" })
      ).toBeChecked();
      await user.click(screen.getByRole('button', { name: 'Replace data' }));

      expect(downloadText).toHaveBeenCalledTimes(1);
      const [, text] = vi.mocked(downloadText).mock.calls[0];
      expect(JSON.parse(text).items.map((item: { name: string }) => item.name)).toEqual(['Read']);
      expect(store.getState().data.items.map((item) => item.name)).toEqual(['Walk 1', 'Walk 2']);
      expect(screen.getByRole('status')).toHaveTextContent('Imported 2 items and 3 sessions.');
    });

    it('should not download when the export box is cleared', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const store = setup();
      await pick(user, backupFile(2, 3));
      await user.click(await screen.findByRole('radio', { name: /Replace/ }));
      await user.click(screen.getByRole('checkbox', { name: "Export this browser's data first" }));
      await user.click(screen.getByRole('button', { name: 'Replace data' }));

      expect(downloadText).not.toHaveBeenCalled();
      expect(store.getState().data.items).toHaveLength(2);
    });

    it.each([
      ['not JSON', 'this is not json'],
      ['the wrong shape', JSON.stringify({ hello: 'world' })],
    ])('should reject a file that is %s', async (_label, text) => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const store = setup();
      const before = store.getState().data;
      await pick(user, new File([text], 'notes.json', { type: 'application/json' }));

      expect(await screen.findByText(NOT_A_BACKUP)).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(store.getState().data).toBe(before);
    });

    it('should clear the previous status when a new file is picked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      setup();
      await pick(user, new File(['nope'], 'notes.json', { type: 'application/json' }));
      expect(await screen.findByText(NOT_A_BACKUP)).toBeVisible();
      await pick(user, backupFile(1, 1));
      await screen.findByRole('dialog', { name: 'Import backup' });
      expect(screen.queryAllByRole('paragraph').map((node) => node.textContent)).not.toContain(
        NOT_A_BACKUP
      );
    });

    it('should change nothing when the dialog is cancelled', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const store = setup();
      const before = store.getState().data;
      await pick(user, backupFile(2, 3));
      await user.click(await screen.findByRole('button', { name: 'Cancel' }));

      expect(store.getState().data).toBe(before);
      expect(downloadText).not.toHaveBeenCalled();
    });

    it.each([
      ['Cancel', async (user: User) => user.click(screen.getByRole('button', { name: 'Cancel' }))],
      ['Escape', async (user: User) => user.keyboard('{Escape}')],
      ['Merge', async (user: User) => user.click(screen.getByRole('button', { name: 'Merge' }))],
    ])('should return focus to Import backup after %s', async (_label, close) => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      setup();
      await pick(user, backupFile(2, 3));
      await screen.findByRole('dialog', { name: 'Import backup' });
      await close(user);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(screen.getByRole('button', { name: 'Import backup' })).toHaveFocus();
    });

    it('should accept the same file twice', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      setup();
      const file = backupFile(1, 1);
      await pick(user, file);
      await user.click(await screen.findByRole('button', { name: 'Cancel' }));
      await pick(user, file);
      expect(await screen.findByRole('dialog', { name: 'Import backup' })).toBeVisible();
    });
  });
});
