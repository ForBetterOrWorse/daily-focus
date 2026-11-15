import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ShortcutsModal } from './shortcuts-modal';

const SHORTCUTS = [
  { keys: ['Shift', '/'], action: 'Show keyboard shortcuts' },
  { keys: ['Shift', 'S'], action: 'Start or pause the timer' },
];

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        keyboard shortcuts
      </button>
      <ShortcutsModal open={open} onClose={() => setOpen(false)} shortcuts={SHORTCUTS} />
    </>
  );
}

describe('ShortcutsModal', () => {
  it('should list every shortcut passed in', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'keyboard shortcuts' }));

    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    const terms = within(dialog).getAllByRole('term');
    expect(terms.map((term) => term.textContent)).toEqual(['Shift+/', 'Shift+S']);
    expect(within(dialog).getByText('Show keyboard shortcuts')).toBeInTheDocument();
    expect(within(dialog).getByText('Start or pause the timer')).toBeInTheDocument();
  });
});
