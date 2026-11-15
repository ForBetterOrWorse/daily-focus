import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from './navbar';

describe('Navbar', () => {
  it('should render a custom app name and navigation items', () => {
    render(
      <Navbar
        appName="Daily Focus"
        navItems={[
          { href: '#today', label: 'Today', current: true },
          { href: '#stats', label: 'Stats' },
          { href: '#settings', label: 'Settings' },
        ]}
      />
    );

    expect(screen.getByRole('link', { name: 'Daily Focus' })).toHaveAttribute('href', '/');
    const navigation = screen.getByRole('navigation', { name: 'Main' });
    expect(navigation).toContainElement(screen.getByRole('link', { name: 'Today' }));
    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Stats' })).toHaveAttribute('href', '#stats');
  });

  it('should call onOpenSettings when the settings button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    render(<Navbar onOpenShortcuts={vi.fn()} onOpenSettings={onOpenSettings} />);

    await user.click(screen.getByRole('button', { name: 'settings' }));

    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('should call onOpenShortcuts when the keyboard shortcuts button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenShortcuts = vi.fn();
    render(<Navbar onOpenShortcuts={onOpenShortcuts} onOpenSettings={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'keyboard shortcuts' }));

    expect(onOpenShortcuts).toHaveBeenCalledOnce();
  });

  it('should render leading actions beside the keyboard shortcuts button', () => {
    render(
      <Navbar leadingActions={<button type="button">Index</button>} onOpenShortcuts={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: 'Index' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'keyboard shortcuts' })).toBeInTheDocument();
  });

  it('should not render a donate link', () => {
    render(<Navbar onOpenShortcuts={vi.fn()} onOpenSettings={vi.fn()} />);

    expect(screen.queryByRole('link', { name: 'Donate' })).not.toBeInTheDocument();
  });
});
