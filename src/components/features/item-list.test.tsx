import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/base/toast/toast';
import { dayKeyOf, weekdayOf } from '@/domain/days';
import { addItem } from '@/domain/items';
import { emptyData } from '@/domain/schema';
import { Today } from '@/pages/today';
import { createStore, type AppStore } from '@/store/store';
import { AppDataProvider } from '@/store/use-app-data';
import { ItemList } from './item-list';
import { LiveAnnouncerProvider } from './live-announcer';

const now = Date.parse('2026-11-01T12:00:00');
const day = '2026-11-01';

function makeItems() {
  let data = emptyData(now);
  for (const name of ['Read', 'Write', 'Walk']) {
    data = addItem(data, { kind: 'task', name, completion: 'check' }, now);
  }
  return data;
}

function renderList(items = makeItems().items, kind: 'habit' | 'task' = 'task') {
  const onReorder = vi.fn();
  const onDelete = vi.fn();
  render(
    <LiveAnnouncerProvider>
      <ItemList
        items={items}
        kind={kind}
        day={day}
        rowButtons={{ current: new Map() }}
        addButton={{ current: null }}
        onOpen={vi.fn()}
        onDelete={onDelete}
        onReorder={onReorder}
      />
    </LiveAnnouncerProvider>
  );
  return { onReorder, onDelete };
}

describe('ItemList', () => {
  it('should name each action, call delete with the item and summarize metadata', async () => {
    const user = userEvent.setup();
    let data = emptyData(now);
    data = addItem(
      data,
      {
        kind: 'habit',
        name: 'Read',
        completion: 'time',
        target: 30,
        timerStyle: 'free',
        days: [0, 1, 2, 3, 4, 5, 6],
      },
      now
    );
    const { onDelete } = renderList(data.items, 'habit');
    expect(screen.getByText('30 min · Every day')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit Read' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Delete Read' }));
    expect(onDelete).toHaveBeenCalledWith(data.items[0]);
  });

  it('should hide the move control when there is one item', () => {
    renderList(makeItems().items.slice(0, 1));
    expect(screen.queryByRole('button', { name: /Move Read/ })).not.toBeInTheDocument();
  });

  it('should show the move control when there are two items', () => {
    renderList(makeItems().items.slice(0, 2));
    expect(screen.getByRole('button', { name: /Move Read/ })).toBeVisible();
  });

  it('should show empty-list text', () => {
    renderList([], 'habit');
    expect(screen.getByText('No habits yet.')).toBeVisible();
  });

  it('should move a focused grip with arrow keys and announce the new position', async () => {
    const user = userEvent.setup();
    const items = makeItems().items;
    const { onReorder } = renderList(items);
    screen.getByRole('button', { name: /Move Write/ }).focus();
    await user.keyboard('{ArrowDown}');
    expect(onReorder).toHaveBeenCalledWith([items[0].id, items[2].id, items[1].id]);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Write moved to 3 of 3')
    );
  });

  it('should offer boundary-disabled menu actions and move through the menu', async () => {
    const user = userEvent.setup();
    const items = makeItems().items;
    const { onReorder } = renderList(items);
    await user.click(screen.getByRole('button', { name: /Move Read/ }));
    expect(screen.getByRole('menuitem', { name: 'Move up' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    await user.click(screen.getByRole('menuitem', { name: 'Move down' }));
    expect(onReorder).toHaveBeenCalledWith([items[1].id, items[0].id, items[2].id]);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Read moved to 2 of 3')
    );
    await user.click(screen.getByRole('button', { name: /Move Walk/ }));
    expect(screen.getByRole('menuitem', { name: 'Move down' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('should move a dragged grip and suppress the following click', async () => {
    const items = makeItems().items;
    const { onReorder } = renderList(items);
    const rows = within(screen.getByRole('list', { name: 'Your tasks' })).getAllByRole('listitem');
    rows.forEach((row, index) => {
      Object.defineProperty(row, 'offsetTop', { configurable: true, value: index * 50 });
      Object.defineProperty(row, 'offsetHeight', { configurable: true, value: 40 });
    });
    const grip = screen.getByRole('button', { name: /Move Read/ });
    function pointer(target: Element | Window, type: string, y: number) {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientY: y,
      });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      fireEvent(target, event);
    }
    pointer(grip, 'pointerdown', 10);
    pointer(window, 'pointermove', 130);
    pointer(window, 'pointerup', 130);
    fireEvent.click(grip);
    expect(onReorder).toHaveBeenCalledWith([items[1].id, items[2].id, items[0].id]);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Read moved to 3 of 3')
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

const stores: AppStore[] = [];
afterEach(() => {
  stores.splice(0).forEach((store) => store.destroy());
  window.localStorage.clear();
});

function setupToday() {
  const store = createStore({ storage: window.localStorage, now: Date.now });
  stores.push(store);
  store.dispatch({ type: 'setColumnsOpen', open: true });
  render(
    <AppDataProvider store={store}>
      <ToastProvider>
        <LiveAnnouncerProvider>
          <Today />
        </LiveAnnouncerProvider>
      </ToastProvider>
    </AppDataProvider>
  );
  return store;
}

describe('Item drawer integration', () => {
  it('should return focus to Edit after Back, Cancel and Save, and to the gear on close', async () => {
    const user = userEvent.setup();
    setupToday();
    await user.click(screen.getByRole('button', { name: 'Read 30 min' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    const gear = screen.getByRole('button', { name: 'Edit habits' });
    await user.click(gear);
    for (const action of ['All habits', 'Cancel', 'Save changes']) {
      await user.click(screen.getByRole('button', { name: 'Edit Read' }));
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
      await user.click(screen.getByRole('button', { name: action }));
      expect(screen.getByRole('button', { name: 'Edit Read' })).toHaveFocus();
    }
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(gear).toHaveFocus());
    await user.click(screen.getByRole('button', { name: 'New habit' }));
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'All habits' })).not.toBeInTheDocument();
  });

  it('should list off-day habits and show reordered items on Today', async () => {
    const user = userEvent.setup();
    const store = setupToday();
    const today = dayKeyOf(Date.now(), store.getState().data.settings.dayStartHour);
    act(() => {
      for (const name of ['First', 'Second']) {
        store.dispatch({
          type: 'addItem',
          item: { kind: 'habit', name, completion: 'check' },
        });
      }
      store.dispatch({
        type: 'addItem',
        item: {
          kind: 'habit',
          name: 'Off day',
          completion: 'check',
          days: [(weekdayOf(today) + 1) % 7],
        },
      });
    });
    await user.click(screen.getByRole('button', { name: 'Edit habits' }));
    expect(screen.getByRole('button', { name: 'Edit Off day' })).toBeVisible();
    screen.getByRole('button', { name: /Move First/ }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /Move First/ })).toHaveFocus();
    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).getByRole('status')).toHaveTextContent(
        'First moved to 2 of 3'
      )
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    const habits = screen.getByRole('region', { name: 'Habits' });
    expect(
      within(habits)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['Second', 'First']);
  });
});
