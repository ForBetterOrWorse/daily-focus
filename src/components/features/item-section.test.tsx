import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/base/toast/toast';
import { TASK_PRESETS, presetInput } from '@/domain/presets';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { createStore, type AppStore } from '@/store/store';
import { AppDataProvider } from '@/store/use-app-data';
import { ItemSection } from './item-section';
import { LiveAnnouncerProvider } from './live-announcer';

vi.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: vi.fn(() => false) }));

const stores: AppStore[] = [];

function setup({ done = false }: { done?: boolean } = {}) {
  const store = createStore({ storage: window.localStorage, now: Date.now });
  stores.push(store);
  store.dispatch({
    type: 'addItem',
    item: { ...presetInput(TASK_PRESETS[1], []), name: 'Read' },
  });
  if (done) {
    store.dispatch({ type: 'tapItem', itemId: store.getState().data.items[0].id });
  }
  render(
    <AppDataProvider store={store}>
      <ToastProvider>
        <LiveAnnouncerProvider>
          <ItemSection section="tasks" />
        </LiveAnnouncerProvider>
      </ToastProvider>
    </AppDataProvider>
  );
}

function tile(name: RegExp) {
  return screen.getByRole('button', { name });
}

afterEach(() => {
  stores.splice(0).forEach((store) => store.destroy());
  window.localStorage.clear();
  vi.mocked(useReducedMotion).mockReturnValue(false);
  vi.useRealTimers();
});

describe('ItemSection celebration', () => {
  it('should celebrate an item that becomes done during the visit', async () => {
    setup();
    expect(tile(/^Read\./)).not.toHaveAttribute('data-celebrate');

    await userEvent.click(tile(/^Read\./));

    expect(tile(/^Read, done/)).toHaveAttribute('data-celebrate', 'true');
  });

  it('should not celebrate an item that is already done on load', () => {
    setup({ done: true });

    expect(tile(/^Read, done/)).not.toHaveAttribute('data-celebrate');
  });

  it('should celebrate once per item per day', async () => {
    setup();
    await userEvent.click(tile(/^Read\./));
    await userEvent.click(tile(/^Read, done/));
    expect(tile(/^Read\./)).not.toHaveAttribute('data-celebrate');

    await userEvent.click(tile(/^Read\./));

    expect(tile(/^Read, done/)).not.toHaveAttribute('data-celebrate');
  });

  it('should not render the burst under reduced motion', async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    setup();

    await userEvent.click(tile(/^Read\./));

    expect(tile(/^Read, done/)).not.toHaveAttribute('data-celebrate');
  });

  it('should announce the goal met on the transition', async () => {
    setup();
    await userEvent.click(tile(/^Read\./));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(screen.getByRole('status')).toHaveTextContent('Read goal met');
  });
});

describe('ItemSection taps', () => {
  it('should count a tapped count item without offering an undo toast', async () => {
    const store = createStore({ storage: window.localStorage, now: Date.now });
    stores.push(store);
    store.dispatch({
      type: 'addItem',
      item: { name: 'Water', groupId: null, kind: 'task', completion: 'count', target: 8 },
    });
    render(
      <AppDataProvider store={store}>
        <ToastProvider>
          <LiveAnnouncerProvider>
            <ItemSection section="tasks" />
          </LiveAnnouncerProvider>
        </ToastProvider>
      </AppDataProvider>
    );

    await userEvent.click(tile(/^Water, 0 of 8/));

    expect(tile(/^Water, 1 of 8/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });
});

describe('ItemSection presets', () => {
  function setupEmpty() {
    const store = createStore({ storage: window.localStorage, now: Date.now });
    stores.push(store);
    render(
      <AppDataProvider store={store}>
        <ToastProvider>
          <LiveAnnouncerProvider>
            <ItemSection section="tasks" />
          </LiveAnnouncerProvider>
        </ToastProvider>
      </AppDataProvider>
    );
    return store;
  }

  it('should keep every preset after the first click and mark it chosen', async () => {
    setupEmpty();

    await userEvent.click(screen.getByRole('button', { name: 'Plan the week' }));

    expect(screen.getByRole('checkbox', { name: 'Plan the week' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Reply to emails' })).not.toBeChecked();
  });

  it('should add the chosen presets on Done', async () => {
    const store = setupEmpty();
    await userEvent.click(screen.getByRole('button', { name: 'Plan the week' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Reply to emails' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Plan the week' }));

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(store.getState().data.items.map((item) => item.name)).toEqual(['Reply to emails']);
  });

  it('should show the added presets as tiles after Done', async () => {
    setupEmpty();
    await userEvent.click(screen.getByRole('button', { name: 'Plan the week' }));

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(await screen.findByRole('button', { name: /Plan the week/ })).toBeInTheDocument();
  });

  it('should not add Done with nothing chosen', async () => {
    const store = setupEmpty();
    await userEvent.click(screen.getByRole('button', { name: 'Plan the week' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Plan the week' }));

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(store.getState().data.items).toHaveLength(0);
  });

  it('should restore the suggestions on Cancel without adding anything', async () => {
    const store = setupEmpty();
    await userEvent.click(screen.getByRole('button', { name: 'Plan the week' }));

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(store.getState().data.items).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Plan the week' })).toBeVisible();
  });
});
