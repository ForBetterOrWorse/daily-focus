import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/base/button/button';
import { ToastProvider } from '@/components/base/toast/toast';
import { createStore, type AppStore } from '@/store/store';
import { AppDataProvider } from '@/store/use-app-data';
import { PlusLgIcon } from './app-icons';
import { GroupSettings } from './group-settings';

const stores: AppStore[] = [];

function Harness() {
  const [adding, setAdding] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button
        ref={addButton}
        variant="ghost"
        size="md"
        icon={PlusLgIcon}
        aria-label="New group"
        aria-expanded={adding}
        onClick={() => setAdding(true)}
      />
      <GroupSettings adding={adding} onAddingChange={setAdding} addButtonRef={addButton} />
    </>
  );
}

function setup() {
  const store = createStore({ storage: window.localStorage, now: Date.now });
  stores.push(store);
  store.dispatch({ type: 'addGroup', name: 'Zen' });
  const [first] = store.getState().data.groups;
  store.dispatch({
    type: 'addItem',
    item: {
      kind: 'task',
      name: 'Read',
      groupId: first.id,
      completion: 'check',
    },
  });
  render(
    <AppDataProvider store={store}>
      <ToastProvider>
        <Harness />
      </ToastProvider>
    </AppDataProvider>
  );
  return { store, first };
}

function rowFor(name: string) {
  const row = screen
    .getAllByRole('listitem', { hidden: true })
    .find((item) => within(item).queryByText(name) !== null);
  if (!row) {
    throw new Error(`No row for ${name}`);
  }
  return row;
}

function names(store: AppStore) {
  return store.getState().data.groups.map((group) => group.name);
}

afterEach(() => {
  stores.length = 0;
  window.localStorage.clear();
});

describe('GroupSettings', () => {
  it('should show item counts per group', () => {
    setup();
    expect(screen.getByText('1 item')).toBeInTheDocument();
    expect(screen.getAllByText('No items').length).toBeGreaterThan(0);
  });

  it('should rename a group with Enter and return focus to its menu', async () => {
    const user = userEvent.setup();
    const { store, first } = setup();

    await user.click(screen.getByRole('button', { name: `Edit ${first.name}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const field = screen.getByRole('textbox', { name: `Rename ${first.name}` });
    expect(field).toHaveFocus();

    await user.clear(field);
    await user.type(field, 'Deep work{Enter}');

    expect(names(store)).toContain('Deep work');
    expect(screen.getByRole('button', { name: 'Edit Deep work' })).toHaveFocus();
  });

  it('should cancel a rename with Escape', async () => {
    const user = userEvent.setup();
    const { store, first } = setup();

    await user.click(screen.getByRole('button', { name: `Edit ${first.name}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    await user.keyboard('x{Escape}');

    expect(names(store)).toContain(first.name);
    expect(screen.getByRole('button', { name: `Edit ${first.name}` })).toHaveFocus();
  });

  it('should show the empty and duplicate name errors on rename', async () => {
    const user = userEvent.setup();
    const { first } = setup();

    await user.click(screen.getByRole('button', { name: `Edit ${first.name}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const field = screen.getByRole('textbox', { name: `Rename ${first.name}` });
    await user.clear(field);
    await user.keyboard('{Enter}');
    expect(screen.getByText('Enter a group name')).toBeVisible();

    await user.type(field, 'zen{Enter}');
    expect(screen.getByText('You already have a Zen group')).toBeVisible();
  });

  it('should add a group from the plus and return focus to it', async () => {
    const user = userEvent.setup();
    const { store } = setup();
    const plus = screen.getByRole('button', { name: 'New group' });

    await user.click(plus);
    expect(plus).toHaveAttribute('aria-expanded', 'true');
    const field = screen.getByRole('textbox', { name: 'New group' });
    expect(field).toHaveFocus();
    await user.type(field, 'Reading');
    await user.click(screen.getByRole('button', { name: 'Add group' }));

    expect(names(store)).toContain('Reading');
    expect(plus).toHaveFocus();
    expect(plus).toHaveAttribute('aria-expanded', 'false');
  });

  it('should show an error for a duplicate new group and cancel with Escape', async () => {
    const user = userEvent.setup();
    const { store } = setup();
    const before = names(store);

    await user.click(screen.getByRole('button', { name: 'New group' }));
    await user.type(screen.getByRole('textbox', { name: 'New group' }), 'zen{Enter}');
    expect(screen.getByText('You already have a Zen group')).toBeVisible();

    await user.keyboard('{Escape}');
    expect(names(store)).toEqual(before);
    expect(screen.getByRole('button', { name: 'New group' })).toHaveFocus();
  });

  it('should remove a group at once, keep the row collapsing, then unmount it', async () => {
    const user = userEvent.setup();
    const { store, first } = setup();

    await user.click(screen.getByRole('button', { name: `Edit ${first.name}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Remove' }));

    expect(names(store)).not.toContain(first.name);
    expect(screen.getByText(`${first.name} removed`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'New group' })).toHaveFocus();

    const row = rowFor(first.name);
    expect(row).toHaveAttribute('data-state', 'exiting');
    expect(row).toHaveAttribute('aria-hidden', 'true');
    expect(row).toHaveAttribute('inert');

    fireEvent.transitionEnd(row);

    expect(screen.queryByText(first.name)).not.toBeInTheDocument();
  });

  it('should unmount a removed row after the fallback timeout without a transition event', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { first } = setup();

      await user.click(screen.getByRole('button', { name: `Edit ${first.name}` }));
      await user.click(screen.getByRole('menuitem', { name: 'Remove' }));
      expect(rowFor(first.name)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(screen.queryByText(first.name)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should restore a removed group with Undo and expand its row', async () => {
    const user = userEvent.setup();
    const { store, first } = setup();
    const before = store.getState().data;

    await user.click(screen.getByRole('button', { name: `Edit ${first.name}` }));
    await user.click(screen.getByRole('menuitem', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(store.getState().data.groups).toEqual(before.groups);
    expect(store.getState().data.items.find((item) => item.name === 'Read')?.groupId).toBe(
      first.id
    );
    const row = rowFor(first.name);
    expect(row).not.toHaveAttribute('inert');
    expect(row).not.toHaveAttribute('data-state', 'exiting');
  });

  it('should mount a newly added row collapsed and expand it', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'New group' }));
    await user.type(screen.getByRole('textbox', { name: 'New group' }), 'Reading');
    await user.click(screen.getByRole('button', { name: 'Add group' }));

    const row = rowFor('Reading');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(row).toHaveAttribute('data-state', 'open');
    fireEvent.transitionEnd(row);
    expect(row).toHaveAttribute('data-state', 'settled');
  });
});
