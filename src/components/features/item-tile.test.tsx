import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Item } from '@/domain/types';
import { ItemTile } from './item-tile';

const readItem: Item = {
  id: 'read',
  kind: 'task',
  name: 'Read',
  completion: 'time',
  timerStyle: 'free',
  goals: [],
  createdAt: 0,
  updatedAt: 0,
};

const draftItem: Item = { ...readItem, id: 'draft', name: 'Draft Q4 report' };
const meditateItem: Item = {
  ...readItem,
  id: 'meditate',
  kind: 'habit',
  name: 'Meditate',
  completion: 'check',
  timerStyle: undefined,
  days: [0, 1, 2, 3, 4, 5, 6],
};
const waterItem: Item = { ...readItem, id: 'water', name: 'Drink water', completion: 'count' };

interface TileOptions {
  amount?: number;
  goal?: number;
  done?: boolean;
  celebrate?: boolean;
  running?: boolean;
  onTap?: () => void;
}

function renderTile(
  item: Item,
  {
    amount = 0,
    goal,
    done = false,
    celebrate = false,
    running = false,
    onTap = vi.fn(),
  }: TileOptions = {}
) {
  return {
    ...render(
      <ItemTile
        item={item}
        amount={amount}
        goal={goal}
        done={done}
        celebrate={celebrate}
        running={running}
        onTap={onTap}
      />
    ),
    onTap,
  };
}

describe('ItemTile', () => {
  it('should label an idle timer with progress, goal, and its action', () => {
    renderTile(readItem, { amount: 29, goal: 30 });

    expect(screen.getByRole('button', { name: 'Read, 29 of 30 min. Start timer' })).toBeVisible();
    expect(screen.getByText('30 min')).toBeVisible();
  });

  it('should label a running timer and its pause action', () => {
    renderTile(draftItem, { amount: 70, goal: 120, running: true });

    expect(
      screen.getByRole('button', { name: 'Draft Q4 report, running, 70 of 120 min. Pause timer' })
    ).toBeVisible();
  });

  it('should label a completed check item as done and actionable to uncheck', () => {
    renderTile(meditateItem, { done: true });

    expect(screen.getByRole('button', { name: 'Meditate, done. Uncheck' })).toBeVisible();
  });

  it('should label an incomplete check item as actionable to check off', () => {
    renderTile(meditateItem);

    expect(screen.getByRole('button', { name: 'Meditate. Check off' })).toBeVisible();
  });

  it('should label count progress and the add-one action', () => {
    renderTile(waterItem, { amount: 6, goal: 8 });

    expect(
      screen.getByRole('button', { name: 'Drink water, 6 of 8 times. Add one' })
    ).toBeVisible();
    expect(screen.getByText('8 times')).toBeVisible();
  });

  it('should label a completed timer with its reopen action', () => {
    renderTile(readItem, { amount: 29, goal: 30, done: true });

    expect(screen.getByRole('button', { name: 'Read, done, 29 of 30 min. Reopen' })).toBeVisible();
  });

  it('should call onTap when pressed', async () => {
    const user = userEvent.setup();
    const { onTap } = renderTile(readItem, { goal: 30 });

    await user.click(screen.getByRole('button', { name: 'Read, 0 of 30 min. Start timer' }));

    expect(onTap).toHaveBeenCalledOnce();
  });

  it('should not celebrate an item that is not done', () => {
    renderTile(meditateItem, { celebrate: true });

    expect(screen.getByRole('button', { name: 'Meditate. Check off' })).not.toHaveAttribute(
      'data-celebrate'
    );
  });
});
