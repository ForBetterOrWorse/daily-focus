import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TextInput } from './text-input';

function Harness() {
  const [value, setValue] = useState('');

  return (
    <TextInput
      aria-label="Project name"
      value={value}
      onChange={(event) => setValue(event.currentTarget.value)}
    />
  );
}

describe('TextInput', () => {
  it('should accept typed text when used without a Field', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByRole('textbox', { name: 'Project name' });
    await user.type(input, 'kestrel');

    expect(input).toHaveValue('kestrel');
  });

  it('should forward its ref to the input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextInput aria-label="Name" ref={ref} />);

    expect(ref.current).toBe(screen.getByRole('textbox', { name: 'Name' }));
  });

  it('should stay focusable and report disabled to assistive technology', async () => {
    const user = userEvent.setup();
    render(<TextInput aria-label="Name" disabled />);

    const input = screen.getByRole('textbox', { name: 'Name' });
    await user.tab();

    expect(input).toHaveAttribute('aria-disabled', 'true');
    expect(input).not.toBeDisabled();
    expect(input).toHaveFocus();
  });

  it('should not accept input while disabled', async () => {
    const user = userEvent.setup();
    render(<TextInput aria-label="Name" disabled />);

    const input = screen.getByRole('textbox', { name: 'Name' });
    await user.type(input, 'kestrel');

    expect(input).toHaveValue('');
  });

  it('should leave a disabled input out of a submitted form', () => {
    render(
      <form>
        <TextInput aria-label="Name" name="name" disabled />
      </form>
    );
    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;

    expect(new FormData(input.form as HTMLFormElement).has('name')).toBe(false);
  });
});
