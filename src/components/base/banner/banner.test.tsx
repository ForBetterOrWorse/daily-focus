import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Banner } from './banner';

describe('Banner', () => {
  it('should render children', () => {
    render(<Banner>Important notice</Banner>);
    expect(screen.getByText('Important notice')).toBeDefined();
  });

  it('should render with the "Notice" accessible label', () => {
    render(<Banner>Notice</Banner>);
    expect(screen.getByRole('complementary', { name: 'Notice' })).toBeDefined();
  });

  it('should render a custom accessible label', () => {
    render(<Banner ariaLabel="Persistent notice">Notice</Banner>);
    expect(screen.getByRole('complementary', { name: 'Persistent notice' })).toBeDefined();
  });

  it('should render a dismiss button by default', () => {
    render(<Banner onDismiss={() => {}}>Notice</Banner>);
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeDefined();
  });

  it('should not render a dismiss button when dismissible is false', () => {
    render(<Banner dismissible={false}>Notice</Banner>);
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  });

  it('should call onDismiss once, only after the banner opacity transition ends', async () => {
    const onDismiss = vi.fn();
    render(<Banner onDismiss={onDismiss}>Notice</Banner>);
    const banner = screen.getByRole('complementary', { name: 'Notice' });
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.transitionEnd(banner, { propertyName: 'grid-template-rows' });
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.transitionEnd(banner, { propertyName: 'opacity' });
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('should ignore a transitionend bubbling from a child', async () => {
    const onDismiss = vi.fn();
    render(<Banner onDismiss={onDismiss}>Notice</Banner>);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    fireEvent.transitionEnd(screen.getByText('Notice'), { propertyName: 'opacity' });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should not call onDismiss for a transitionend before dismissing', () => {
    const onDismiss = vi.fn();
    render(<Banner onDismiss={onDismiss}>Notice</Banner>);
    fireEvent.transitionEnd(screen.getByRole('complementary'), { propertyName: 'opacity' });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should make the banner inert while it leaves', async () => {
    render(<Banner onDismiss={() => {}}>Notice</Banner>);
    const banner = screen.getByRole('complementary', { name: 'Notice' });
    expect(banner).not.toHaveAttribute('inert');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(banner).toHaveAttribute('inert');
  });

  it('should announce the message through a status region when announce is set', () => {
    render(<Banner announce>Autosave stopped</Banner>);

    expect(screen.getByRole('status')).toHaveTextContent('Autosave stopped');
  });

  it('should leave the message out of a live region by default', () => {
    render(<Banner>Autosave stopped</Banner>);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Autosave stopped')).toBeInTheDocument();
  });
});
