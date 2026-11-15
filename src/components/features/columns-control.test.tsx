import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ColumnsControl } from './columns-control';

describe('ColumnsControl', () => {
  it('should call onToggle when the invite button is clicked', async () => {
    const onToggle = vi.fn();
    render(<ColumnsControl variant="invite" open={false} controlsId="cols" onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add habits and tasks' }));

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('should call onToggle when the toggle is clicked', async () => {
    const onToggle = vi.fn();
    render(<ColumnsControl variant="toggle" open={false} controlsId="cols" onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('button', { name: 'Habits and tasks' }));

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('should follow open in aria-expanded and title', () => {
    const { rerender } = render(
      <ColumnsControl variant="toggle" open={false} controlsId="cols" onToggle={vi.fn()} />
    );
    const toggle = screen.getByRole('button', { name: 'Habits and tasks' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('title', 'Show habits and tasks (\\)');

    rerender(<ColumnsControl variant="toggle" open controlsId="cols" onToggle={vi.fn()} />);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('title', 'Hide habits and tasks (\\)');
  });

  it('should expose the controlled region and the shortcut on the toggle', () => {
    render(<ColumnsControl variant="toggle" open={false} controlsId="cols" onToggle={vi.fn()} />);

    const toggle = screen.getByRole('button', { name: 'Habits and tasks' });

    expect(toggle).toHaveAttribute('aria-controls', 'cols');
    expect(toggle).toHaveAttribute('aria-keyshortcuts', '\\');
  });

  it('should expose the controlled region on the invite button', () => {
    render(<ColumnsControl variant="invite" open={false} controlsId="cols" onToggle={vi.fn()} />);

    const invite = screen.getByRole('button', { name: 'Add habits and tasks' });

    expect(invite).toHaveAttribute('aria-controls', 'cols');
    expect(invite).toHaveAttribute('aria-expanded', 'false');
  });

  it('should keep the same button when the invite becomes the toggle', () => {
    const { rerender } = render(
      <ColumnsControl variant="invite" open={false} controlsId="cols" onToggle={vi.fn()} />
    );
    const button = screen.getByRole('button', { name: 'Add habits and tasks' });

    rerender(<ColumnsControl variant="toggle" open controlsId="cols" onToggle={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Habits and tasks' })).toBe(button);
  });
});
