import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImportDialog, type ImportDialogProps } from './import-dialog';

const EXPORTED_AT = new Date(2026, 9, 20, 12, 0, 0).getTime();

function setup(props: Partial<ImportDialogProps> = {}) {
  const onCancel = vi.fn();
  const onSubmit = vi.fn();
  render(
    <ImportDialog
      open
      fileName="daily-focus-2026-10-20.json"
      items={11}
      sessions={214}
      exportedAt={EXPORTED_AT}
      triggerElement={null}
      onCancel={onCancel}
      onSubmit={onSubmit}
      {...props}
    />
  );
  return { onCancel, onSubmit };
}

describe('ImportDialog', () => {
  it('should show the file name and what the backup holds', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Import backup' })).toBeVisible();
    expect(screen.getByText('daily-focus-2026-10-20.json')).toBeVisible();
    expect(screen.getByText('Backed up October 20 · 11 items · 214 sessions')).toBeVisible();
  });

  it('should leave out the backup date when it is unknown', () => {
    setup({ exportedAt: null });
    expect(screen.getByText('11 items · 214 sessions')).toBeVisible();
  });

  it('should select Merge by default and submit it without exporting', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    expect(screen.getByRole('radio', { name: /Merge/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Merge' }));
    expect(onSubmit).toHaveBeenCalledWith('merge', false);
  });

  it('should offer a checked export option and a danger submit for Replace', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.click(screen.getByRole('radio', { name: /Replace/ }));

    expect(
      screen.getByRole('checkbox', { name: "Export this browser's data first" })
    ).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Replace data' }));
    expect(onSubmit).toHaveBeenCalledWith('replace', true);
  });

  it('should submit Replace without exporting when the box is cleared', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.click(screen.getByRole('radio', { name: /Replace/ }));
    await user.click(screen.getByRole('checkbox', { name: "Export this browser's data first" }));
    await user.click(screen.getByRole('button', { name: 'Replace data' }));
    expect(onSubmit).toHaveBeenCalledWith('replace', false);
  });

  it('should call onCancel from Cancel', async () => {
    const user = userEvent.setup();
    const { onCancel, onSubmit } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
