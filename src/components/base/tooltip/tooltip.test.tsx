import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tooltip } from './tooltip';

let clock = 0;

function setup() {
  vi.setSystemTime(++clock * 100_000);
  return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
}

function getTooltip() {
  return screen.getByRole('tooltip', { hidden: true });
}

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('jest', { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('should open after the hover delay', async () => {
    const user = setup();
    render(
      <Tooltip label="Show habits and tasks">
        <button type="button" aria-label="Habits and tasks">
          Open
        </button>
      </Tooltip>
    );

    await user.hover(screen.getByRole('button', { name: 'Habits and tasks' }));
    act(() => vi.advanceTimersByTime(100));

    expect(getTooltip()).toHaveTextContent('Show habits and tasks');
  });

  it('should open on keyboard focus and describe its trigger', async () => {
    const user = setup();
    render(
      <Tooltip label="Show habits and tasks">
        <button type="button">Open</button>
      </Tooltip>
    );

    await user.tab();

    expect(getTooltip()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAccessibleDescription(
      'Show habits and tasks'
    );
  });

  it('should close on Escape without moving focus', async () => {
    const user = setup();
    render(
      <Tooltip label="Show habits and tasks">
        <button type="button">Open</button>
      </Tooltip>
    );

    await user.tab();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('should preserve an existing description on its trigger', async () => {
    const user = setup();
    render(
      <>
        <p id="hint">Needs a title</p>
        <Tooltip label="Show habits and tasks">
          <button type="button" aria-describedby="hint">
            Open
          </button>
        </Tooltip>
      </>
    );

    await user.tab();

    expect(screen.getByRole('button', { name: 'Open' })).toHaveAccessibleDescription(
      'Needs a title Show habits and tasks'
    );
  });
});
