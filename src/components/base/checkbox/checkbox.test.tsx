import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './checkbox';

function Harness({ description }: { description?: string }) {
  const [checked, setChecked] = useState(false);

  return (
    <Checkbox
      checked={checked}
      onChange={setChecked}
      label="Email me replies"
      description={description}
    />
  );
}

describe('Checkbox', () => {
  it('should toggle when its label is clicked', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const checkbox = screen.getByRole('checkbox', { name: 'Email me replies' });
    expect(checkbox).not.toBeChecked();

    await user.click(screen.getByText('Email me replies'));

    expect(checkbox).toBeChecked();
  });

  it('should toggle with the Space key', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    await user.keyboard(' ');

    expect(screen.getByRole('checkbox', { name: 'Email me replies' })).toBeChecked();
  });

  it('should describe the checkbox with its description', () => {
    render(<Harness description="At most one email a day." />);

    expect(screen.getByRole('checkbox', { name: 'Email me replies' })).toHaveAccessibleDescription(
      'At most one email a day.'
    );
  });

  it('should ignore clicks while disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} label="Email me replies" disabled />);

    await user.click(screen.getByRole('checkbox', { name: 'Email me replies' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should ignore the Space key while disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} label="Email me replies" disabled />);

    await user.tab();
    await user.keyboard(' ');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should stay focusable and report disabled to assistive technology', async () => {
    const user = userEvent.setup();
    render(<Checkbox checked={false} onChange={vi.fn()} label="Email me replies" disabled />);

    await user.tab();

    const checkbox = screen.getByRole('checkbox', { name: 'Email me replies' });
    expect(checkbox).toHaveFocus();
    expect(checkbox).toHaveAttribute('aria-disabled', 'true');
  });

  it('should leave a disabled checkbox out of a submitted form', () => {
    render(
      <form aria-label="Preferences">
        <Checkbox checked onChange={vi.fn()} label="Email me replies" name="replies" disabled />
      </form>
    );

    const data = new FormData(screen.getByRole('form', { name: 'Preferences' }) as HTMLFormElement);

    expect(data.has('replies')).toBe(false);
  });
});
