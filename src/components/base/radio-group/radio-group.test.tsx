import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RadioGroup, type RadioGroupProps } from './radio-group';

const options = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly', description: 'Sent on Mondays.' },
  { value: 'never', label: 'Never', disabled: true },
];

function Harness(props: Partial<RadioGroupProps>) {
  const [value, setValue] = useState<string | null>(null);

  return (
    <RadioGroup legend="Digest" options={options} value={value} onChange={setValue} {...props} />
  );
}

describe('RadioGroup', () => {
  it('should name the group with its legend', () => {
    render(<Harness />);

    expect(screen.getByRole('group', { name: 'Digest' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('should choose the clicked option', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByText('Weekly'));

    expect(screen.getByRole('radio', { name: 'Weekly' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Daily' })).not.toBeChecked();
  });

  it('should move the choice with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('radio', { name: 'Daily' }));
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('radio', { name: 'Weekly' })).toBeChecked();
  });

  it('should keep a disabled option in the arrow-key order without choosing it', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('radio', { name: 'Weekly' }));
    await user.keyboard('{ArrowDown}');

    const never = screen.getByRole('radio', { name: 'Never' });
    expect(never).toHaveFocus();
    expect(never).toHaveAttribute('aria-disabled', 'true');
    expect(never).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Weekly' })).toBeChecked();
  });

  it('should ignore clicks on a disabled option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RadioGroup legend="Digest" options={options} value="daily" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: 'Never' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Daily' })).toBeChecked();
  });

  it('should describe an option with its description', () => {
    render(<Harness />);

    expect(screen.getByRole('radio', { name: 'Weekly' })).toHaveAccessibleDescription(
      'Sent on Mondays.'
    );
  });

  it('should describe the group with the hint and the error', () => {
    render(<Harness hint="Pick how often." error="Choose a digest option." required />);

    const group = screen.getByRole('group', { name: 'Digest required' });
    expect(group).toHaveAccessibleDescription('Pick how often. Choose a digest option.');
  });

  describe('clearing the error', () => {
    const plainOptions = options.map(({ description, ...option }) => option);
    const renderGroup = (error?: string) => (
      <RadioGroup
        legend="Digest"
        options={plainOptions}
        value={null}
        onChange={vi.fn()}
        error={error}
      />
    );

    it('should drop the error from aria-describedby at once', () => {
      const { rerender } = render(renderGroup('Choose a digest option.'));
      rerender(renderGroup(undefined));

      expect(screen.getByRole('group', { name: 'Digest' })).not.toHaveAttribute('aria-describedby');
    });

    it('should keep the old message hidden in the DOM until the transition ends, then remove it', () => {
      const { rerender } = render(renderGroup('Choose a digest option.'));
      rerender(renderGroup(undefined));

      const message = screen.getByRole('paragraph', { hidden: true });
      expect(message).toHaveAttribute('aria-hidden', 'true');

      fireEvent.transitionEnd(message, { propertyName: 'grid-template-rows' });
      expect(screen.getByText('Choose a digest option.')).toBeInTheDocument();

      fireEvent.transitionEnd(message, { propertyName: 'opacity' });
      expect(screen.queryByText('Choose a digest option.')).not.toBeInTheDocument();
    });

    it('should show a new error that arrives during the exit and keep it', () => {
      const { rerender } = render(renderGroup('Choose a digest option.'));
      rerender(renderGroup(undefined));
      rerender(renderGroup('Pick one.'));

      const message = screen.getByRole('paragraph');
      expect(message).not.toHaveAttribute('aria-hidden');
      expect(screen.queryByText('Choose a digest option.')).not.toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Digest' })).toHaveAccessibleDescription(
        'Pick one.'
      );

      fireEvent.transitionEnd(message, { propertyName: 'opacity' });
      expect(screen.getByText('Pick one.')).toBeInTheDocument();
    });
  });
});
