import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeleteDialog } from './delete-dialog';

describe('DeleteDialog', () => {
  it('should focus Cancel and call the appropriate action', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<DeleteDialog open title="Delete Walk" onCancel={onCancel} onConfirm={onConfirm} />);
    const dialog = screen.getByRole('dialog', { name: 'Delete Walk' });
    expect(within(dialog).getByText("This can't be undone.")).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('should show the history summary and undo warning in one paragraph', () => {
    render(
      <DeleteDialog
        open
        title="Delete Walk"
        summary="Delete Walk and its 3 days of history."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    const dialog = screen.getByRole('dialog', { name: 'Delete Walk' });
    expect(
      within(dialog).getByText("Delete Walk and its 3 days of history. This can't be undone.")
    ).toBeVisible();
  });

  it('should omit the history summary when none is given', () => {
    render(<DeleteDialog open title="Delete Walk" onCancel={vi.fn()} onConfirm={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Delete Walk' });
    expect(within(dialog).queryByText(/and its/)).not.toBeInTheDocument();
  });
});
