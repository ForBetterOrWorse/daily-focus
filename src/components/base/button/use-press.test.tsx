import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { usePress } from './use-press';

function Harness({
  disabled,
  spaceActivates = true,
}: {
  disabled?: boolean;
  spaceActivates?: boolean;
}) {
  const { pressed, handlers } = usePress<HTMLButtonElement>({
    disabled,
    spaceActivates,
  });

  return (
    <button {...handlers} data-pressed={pressed || undefined}>
      Press
    </button>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('usePress', () => {
  it('should set pressed on Space and clear it on keyup', () => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Press' });

    fireEvent.keyDown(button, { key: ' ' });
    expect(button).toHaveAttribute('data-pressed', 'true');

    fireEvent.keyUp(button, { key: ' ' });
    expect(button).not.toHaveAttribute('data-pressed');
  });

  it('should clear Enter after 100ms', () => {
    vi.useFakeTimers();
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Press' });

    fireEvent.keyDown(button, { key: 'Enter' });
    expect(button).toHaveAttribute('data-pressed', 'true');

    act(() => vi.advanceTimersByTime(99));
    expect(button).toHaveAttribute('data-pressed', 'true');

    act(() => vi.advanceTimersByTime(1));
    expect(button).not.toHaveAttribute('data-pressed');
  });

  it('should restart the Enter timeout on another press', () => {
    vi.useFakeTimers();
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Press' });

    fireEvent.keyDown(button, { key: 'Enter' });
    act(() => vi.advanceTimersByTime(80));
    fireEvent.keyDown(button, { key: 'Enter' });
    act(() => vi.advanceTimersByTime(99));

    expect(button).toHaveAttribute('data-pressed', 'true');
    act(() => vi.advanceTimersByTime(1));
    expect(button).not.toHaveAttribute('data-pressed');
  });

  it('should cancel the Enter timeout when Space is pressed', () => {
    vi.useFakeTimers();
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Press' });

    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: ' ' });
    act(() => vi.advanceTimersByTime(100));

    expect(button).toHaveAttribute('data-pressed', 'true');
    fireEvent.keyUp(button, { key: ' ' });
    expect(button).not.toHaveAttribute('data-pressed');
  });

  it('should ignore repeated keydown events', () => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Press' });

    fireEvent.keyDown(button, { key: 'Enter', repeat: true });
    expect(button).not.toHaveAttribute('data-pressed');
  });

  it('should clear pressed on blur', () => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Press' });

    fireEvent.keyDown(button, { key: ' ' });
    fireEvent.blur(button);

    expect(button).not.toHaveAttribute('data-pressed');
  });

  it('should not set pressed when disabled', () => {
    render(<Harness disabled />);
    const button = screen.getByRole('button', { name: 'Press' });

    fireEvent.keyDown(button, { key: ' ' });

    expect(button).not.toHaveAttribute('data-pressed');
  });

  it('should not set pressed for Space when it does not activate', () => {
    render(<Harness spaceActivates={false} />);
    const button = screen.getByRole('button', { name: 'Press' });

    fireEvent.keyDown(button, { key: ' ' });

    expect(button).not.toHaveAttribute('data-pressed');
  });
});
