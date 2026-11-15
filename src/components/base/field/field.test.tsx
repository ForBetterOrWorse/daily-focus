import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TextInput } from '@/components/base/text-input/text-input';
import { Field } from './field';

describe('Field', () => {
  it('should name its control with the label', () => {
    render(
      <Field label="Email">
        <TextInput />
      </Field>
    );

    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  it('should describe the control with the hint', () => {
    render(
      <Field label="Email" hint="We only use it for receipts.">
        <TextInput />
      </Field>
    );

    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription(
      'We only use it for receipts.'
    );
  });

  it('should describe the control with the error instead of the hint', () => {
    render(
      <Field label="Email" hint="We only use it for receipts." error="Enter an email with an @.">
        <TextInput />
      </Field>
    );

    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter an email with an @.');
  });

  it('should show the error in a live region that was mounted before the error arrived', () => {
    const { rerender } = render(
      <Field label="Email" hint="We only use it for receipts.">
        <TextInput />
      </Field>
    );
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeEmptyDOMElement();

    rerender(
      <Field label="Email" hint="We only use it for receipts." error="Enter an email with an @.">
        <TextInput />
      </Field>
    );
    expect(screen.getByRole('status')).toBe(liveRegion);
    expect(liveRegion).toHaveTextContent('Enter an email with an @.');
  });

  it('should keep the live region mounted when there is no hint', () => {
    const { rerender } = render(
      <Field label="Email">
        <TextInput />
      </Field>
    );
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();

    rerender(
      <Field label="Email" error="Enter an email with an @.">
        <TextInput />
      </Field>
    );
    expect(screen.getByRole('status')).toBe(liveRegion);
    expect(liveRegion).toHaveTextContent('Enter an email with an @.');
  });

  it('should hide the hint while the error shows and bring it back after', () => {
    const { rerender } = render(
      <Field label="Email" hint="We only use it for receipts." error="Enter an email with an @.">
        <TextInput />
      </Field>
    );
    expect(screen.queryByText('We only use it for receipts.')).toHaveAttribute(
      'aria-hidden',
      'true'
    );

    rerender(
      <Field label="Email" hint="We only use it for receipts.">
        <TextInput />
      </Field>
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(screen.getByText('We only use it for receipts.')).not.toHaveAttribute('aria-hidden');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAccessibleDescription('We only use it for receipts.');
  });

  it('should mark a required control and show an asterisk', () => {
    render(
      <Field label="Email" required>
        <TextInput />
      </Field>
    );

    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  describe('clearing the error', () => {
    const renderField = (error?: string) => (
      <Field label="Email" error={error}>
        <TextInput />
      </Field>
    );

    it('should drop aria-invalid and the error from aria-describedby at once', () => {
      const { rerender } = render(renderField('Enter an email.'));
      rerender(renderField(undefined));

      const input = screen.getByRole('textbox', { name: 'Email' });
      expect(input).not.toHaveAttribute('aria-invalid');
      expect(input).not.toHaveAttribute('aria-describedby');
    });

    it('should keep the old message hidden in the DOM until the transition ends, then remove it', () => {
      const { rerender } = render(renderField('Enter an email.'));
      rerender(renderField(undefined));

      const message = screen.getByRole('status');
      expect(screen.getByText('Enter an email.')).toHaveAttribute('aria-hidden', 'true');

      fireEvent.transitionEnd(message, { propertyName: 'grid-template-rows' });
      expect(screen.getByText('Enter an email.')).toBeInTheDocument();

      fireEvent.transitionEnd(message, { propertyName: 'opacity' });
      expect(screen.queryByText('Enter an email.')).not.toBeInTheDocument();
    });

    it('should show a new error that arrives during the exit and keep it', () => {
      const { rerender } = render(renderField('Enter an email.'));
      rerender(renderField(undefined));
      rerender(renderField('Use a work email.'));

      const message = screen.getByRole('status');
      expect(screen.getByText('Use a work email.')).not.toHaveAttribute('aria-hidden');
      expect(screen.queryByText('Enter an email.')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription(
        'Use a work email.'
      );

      fireEvent.transitionEnd(message, { propertyName: 'opacity' });
      expect(screen.getByText('Use a work email.')).toBeInTheDocument();
    });
  });
});
