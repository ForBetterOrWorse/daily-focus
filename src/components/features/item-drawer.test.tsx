import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/base/toast/toast';
import { Today } from '@/pages/today';
import { LiveAnnouncerProvider } from './live-announcer';
import { addItem } from '@/domain/items';
import { emptyData } from '@/domain/schema';
import { ItemDrawer } from './item-drawer';
import { createStore, type AppStore } from '@/store/store';
import { AppDataProvider } from '@/store/use-app-data';

const stores: AppStore[] = [];
afterEach(() => {
  stores.splice(0).forEach((store) => store.destroy());
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (Element.prototype as { animate?: typeof Element.prototype.animate }).animate;
});

function setup(names = ['Read', 'Walk']) {
  const store = createStore({ storage: window.localStorage, now: Date.now });
  stores.push(store);
  names.forEach((name) =>
    store.dispatch({
      type: 'addItem',
      item: { kind: 'task', name, groupId: null, completion: 'check' },
    })
  );
  render(
    <StrictMode>
      <AppDataProvider store={store}>
        <ToastProvider>
          <LiveAnnouncerProvider>
            <Today />
          </LiveAnnouncerProvider>
        </ToastProvider>
      </AppDataProvider>
    </StrictMode>
  );
  return store;
}

describe('ItemDrawer deletion', () => {
  it('should keep the confirmation portal outside the drawer inert subtree after reopening', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Edit tasks' }));
    await user.click(screen.getByRole('button', { name: 'Delete Read' }));
    let dialog = screen.getByRole('dialog', { name: 'Delete Read' });
    // jsdom does not enforce inert, so inspect the portal ancestry directly.
    // eslint-disable-next-line testing-library/no-node-access
    expect(dialog.closest('[inert]')).toBeNull();
    await user.keyboard('{Escape}');
    await user.keyboard('{Escape}');
    fireEvent.animationEnd(screen.getByRole('dialog', { name: 'Tasks' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Tasks' })).not.toBeInTheDocument()
    );
    await user.click(screen.getByRole('button', { name: 'Edit tasks' }));
    await user.click(screen.getByRole('button', { name: 'Delete Read' }));
    dialog = screen.getByRole('dialog', { name: 'Delete Read' });
    // eslint-disable-next-line testing-library/no-node-access
    expect(dialog.closest('[inert]')).toBeNull();
  });

  it('should cancel or escape without deleting and restore focus to the row', async () => {
    const user = userEvent.setup();
    const store = setup();
    await user.click(screen.getByRole('button', { name: 'Edit tasks' }));
    const trigger = screen.getByRole('button', { name: 'Delete Read' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Delete Read' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'Tasks' })).toBeVisible();
    expect(store.getState().data.items).toHaveLength(2);
  });

  it('should delete after confirmation, focus the next row, and show a scoped success toast', async () => {
    const user = userEvent.setup();
    const store = setup();
    await user.click(screen.getByRole('button', { name: 'Edit tasks' }));
    await user.click(screen.getByRole('button', { name: 'Delete Read' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete Read' })).getByRole('button', {
        name: 'Delete',
      })
    );
    await waitFor(() =>
      expect(store.getState().data.items.map((item) => item.name)).toEqual(['Walk'])
    );
    expect(screen.getByRole('button', { name: 'Delete Walk' })).toHaveFocus();
    const drawer = screen.getByRole('dialog', { name: 'Tasks' });
    const region = within(drawer).getByRole('region', { name: 'Notifications' });
    expect(region).toHaveAttribute('data-position', 'top-center');
    expect(region).toHaveAttribute('data-scope', 'container');
    expect(within(region).getByText('Read deleted')).toBeVisible();
    expect(within(region).queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('should focus Add after deleting the last item and remove its activity', async () => {
    const user = userEvent.setup();
    const store = setup(['Walk']);
    const id = store.getState().data.items[0].id;
    act(() => store.dispatch({ type: 'tapItem', itemId: id }));
    expect(store.getState().data.marks).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Edit tasks' }));
    await user.click(screen.getByRole('button', { name: 'Delete Walk' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete Walk' })).getByRole('button', {
        name: 'Delete',
      })
    );
    await waitFor(() => expect(store.getState().data.items).toHaveLength(0));
    expect(store.getState().data.marks).toHaveLength(0);
    expect(store.getState().data.sessions).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Add a task' })).toHaveFocus();
  });
});

describe('ItemDrawer history and motion', () => {
  it('should describe tracked time and days of history in confirmation titles', async () => {
    const user = userEvent.setup();
    const now = Date.now();
    let data = emptyData(now);
    data = addItem(
      data,
      {
        kind: 'habit',
        name: 'Read',
        groupId: null,
        completion: 'time',
        target: 30,
        timerStyle: 'free',
        days: [0],
      },
      now
    );
    data = addItem(
      data,
      { kind: 'habit', name: 'Meditate', groupId: null, completion: 'check', days: [0] },
      now
    );
    render(
      <ItemDrawer
        open
        kind="habit"
        groups={data.groups}
        items={data.items}
        start={{ kind: 'list' }}
        day="2026-11-08"
        amountOf={() => 0}
        historyOf={(item) =>
          item.name === 'Read'
            ? { trackedMs: 14 * 60 * 60 * 1000, days: 1 }
            : { trackedMs: 0, days: 58 }
        }
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Delete Read' }));
    const readDialog = screen.getByRole('dialog', { name: 'Delete Read' });
    expect(
      within(readDialog).getByText(
        "Delete Read and its 14 h of tracked time. This can't be undone."
      )
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Delete Meditate' }));
    const meditateDialog = screen.getByRole('dialog', { name: 'Delete Meditate' });
    expect(
      within(meditateDialog).getByText(
        "Delete Meditate and its 58 days of history. This can't be undone."
      )
    ).toBeVisible();
  });

  it.each([false, true])(
    'should finish deleting after the row animation with reduced motion %s',
    async (reduced) => {
      const user = userEvent.setup();
      const animations: { onfinish: (() => void) | null; cancel: () => void }[] = [];
      const animate = vi.fn(
        (
          _frames: Keyframe[] | PropertyIndexedKeyframes | null,
          _options?: number | KeyframeAnimationOptions
        ) => {
          const animation = { onfinish: null, cancel: vi.fn() };
          animations.push(animation);
          return animation as unknown as Animation;
        }
      );
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
      );
      Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate });
      const store = setup();
      await user.click(screen.getByRole('button', { name: 'Edit tasks' }));
      await user.click(screen.getByRole('button', { name: 'Delete Read' }));
      await user.click(
        within(screen.getByRole('dialog', { name: 'Delete Read' })).getByRole('button', {
          name: 'Delete',
        })
      );
      expect(store.getState().data.items).toHaveLength(2);
      expect(screen.getByRole('button', { name: 'Delete Walk' })).toHaveFocus();
      const frames = animate.mock.calls[0][0] as Keyframe[];
      expect(frames[1].opacity).toBe(0);
      expect(frames[1].blockSize).toBe(reduced ? undefined : '0px');
      act(() => animations[0].onfinish?.());
      delete (Element.prototype as { animate?: typeof Element.prototype.animate }).animate;
      await waitFor(() => expect(store.getState().data.items).toHaveLength(1));
    }
  );
});

describe('ItemDrawer interrupted deletion', () => {
  it('should complete a confirmed deletion if the drawer unmounts during its animation', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const data = addItem(
      emptyData(Date.now()),
      { kind: 'task', name: 'Walk', groupId: null, completion: 'check' },
      Date.now()
    );
    Object.defineProperty(Element.prototype, 'animate', {
      configurable: true,
      value: () => ({ onfinish: null, cancel: vi.fn() }),
    });
    const { unmount } = render(
      <ItemDrawer
        open
        kind="task"
        groups={data.groups}
        items={data.items}
        start={{ kind: 'list' }}
        day="2026-11-08"
        amountOf={() => 0}
        historyOf={() => ({ trackedMs: 0, days: 0 })}
        onDelete={onDelete}
        onReorder={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Delete Walk' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete Walk' })).getByRole('button', {
        name: 'Delete',
      })
    );
    expect(onDelete).not.toHaveBeenCalled();
    unmount();
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(data.items[0].id);
  });
});
