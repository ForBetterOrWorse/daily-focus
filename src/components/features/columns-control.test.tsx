import { render, screen, within } from '@testing-library/react';
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

  it('should follow open in aria-expanded without using the native title tooltip', () => {
    const { rerender } = render(
      <ColumnsControl variant="toggle" open={false} controlsId="cols" onToggle={vi.fn()} />
    );
    const toggle = screen.getByRole('button', { name: 'Habits and tasks' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).not.toHaveAttribute('title');

    rerender(<ColumnsControl variant="toggle" open controlsId="cols" onToggle={vi.fn()} />);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).not.toHaveAttribute('title');
  });

  it('should describe the icon-only toggle with its current action', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ColumnsControl variant="toggle" open={false} controlsId="cols" onToggle={vi.fn()} />
    );

    const toggle = screen.getByRole('button', { name: 'Habits and tasks' });
    await user.tab();
    expect(toggle).toHaveAccessibleDescription('Show habits and tasks');
    const tooltip = screen.getByRole('tooltip', { hidden: true });
    expect(tooltip).toHaveTextContent('Show habits and tasks');
    expect(within(tooltip).getByText('\\', { selector: 'kbd' })).toBeInTheDocument();

    rerender(<ColumnsControl variant="toggle" open controlsId="cols" onToggle={vi.fn()} />);

    expect(toggle).toHaveAccessibleDescription('Hide habits and tasks');
    expect(within(tooltip).getByText('\\', { selector: 'kbd' })).toBeInTheDocument();
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
