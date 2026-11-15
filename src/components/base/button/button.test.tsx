import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import styles from './button.module.css';
import { Button } from './button';
import { GearIcon } from '@/components/base/icon';

describe('Button', () => {
  it('should mark a disabled button with aria-disabled and keep it focusable', () => {
    render(
      <Button variant="danger" disabled>
        Reset
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Reset' });
    button.focus();

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(button).toHaveFocus();
  });

  it('should not fire onClick on a disabled button', () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" disabled onClick={onClick}>
        Continue
      </Button>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('should not submit a form from a disabled submit button', () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button variant="primary" type="submit" disabled>
          Save
        </Button>
      </form>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should fire onClick on an enabled button', () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" onClick={onClick}>
        Continue
      </Button>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should expose a toggle button pressed state', () => {
    render(
      <>
        <Button variant="primary" aria-pressed={true}>
          Pin
        </Button>
        <Button variant="primary" aria-pressed={false}>
          Mute
        </Button>
      </>
    );

    expect(screen.getByRole('button', { name: 'Pin', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mute', pressed: false })).toBeInTheDocument();
  });

  it('should default the button type to "button"', () => {
    render(<Button variant="primary">Submit</Button>);

    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'button');
  });

  it('should render a link when href is provided', () => {
    render(
      <Button variant="cta" href="https://example.com" target="_blank" rel="noopener noreferrer">
        Donate
      </Button>
    );

    const link = screen.getByRole('link', { name: 'Donate' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveClass(styles.button, styles.cta);
  });

  it('should draw a square button unless shape is round', () => {
    render(
      <>
        <Button variant="primary">Save</Button>
        <Button variant="primary" shape="round">
          Start
        </Button>
      </>
    );

    expect(screen.getByRole('button', { name: 'Save' })).not.toHaveClass(styles.round);
    expect(screen.getByRole('button', { name: 'Start' })).toHaveClass(styles.round);
  });

  it('should draw an icon-only button round unless shape says square', () => {
    render(
      <>
        <Button variant="ghost" icon={GearIcon} aria-label="Settings" />
        <Button variant="ghost" shape="square" icon={GearIcon} aria-label="Options" />
      </>
    );

    expect(screen.getByRole('button', { name: 'Settings' })).toHaveClass(styles.round);
    expect(screen.getByRole('button', { name: 'Options' })).not.toHaveClass(styles.round);
  });

  it('should render a plain anchor for internal hrefs', () => {
    render(
      <Button variant="primary" href="/about">
        About
      </Button>
    );

    const link = screen.getByRole('link', { name: 'About' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/about');
  });

  it('should block activation of a disabled link', () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" href="/continue" aria-disabled="true" onClick={onClick}>
        Continue
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Continue' });

    const notPrevented = fireEvent.click(link);

    expect(onClick).not.toHaveBeenCalled();
    expect(notPrevented).toBe(false);
  });
});
