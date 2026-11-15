import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { previewChime } from '@/utils/chime';
import { AlertSettings } from './alert-settings';

vi.mock('@/utils/chime', () => ({ previewChime: vi.fn() }));

const BLOCKED = /Notifications are blocked for this site/;

function isBlockedMessageOpen() {
  return screen
    .queryAllByRole('paragraph')
    .some((paragraph) => BLOCKED.test(paragraph.textContent));
}

function stubNotification(permission: NotificationPermission, result: NotificationPermission) {
  const requestPermission = vi.fn(() => Promise.resolve(result));
  vi.stubGlobal(
    'Notification',
    class {
      static permission = permission;
      static requestPermission = requestPermission;
    }
  );
  return requestPermission;
}

afterEach(() => {
  vi.mocked(previewChime).mockClear();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('AlertSettings', () => {
  it('should persist the Sound toggle', async () => {
    stubNotification('default', 'default');
    const user = userEvent.setup();
    render(<AlertSettings />);
    const sound = screen.getByRole('switch', { name: 'Sound' });
    expect(sound).toBeChecked();

    await user.click(sound);

    expect(sound).not.toBeChecked();
    expect(window.localStorage.getItem('daily-focus:soundEnabled')).toBe('false');
  });

  it('should preview the chime only when Sound is turned on', async () => {
    stubNotification('default', 'default');
    const user = userEvent.setup();
    render(<AlertSettings />);
    const sound = screen.getByRole('switch', { name: 'Sound' });

    await user.click(sound);
    expect(previewChime).not.toHaveBeenCalled();

    await user.click(sound);
    expect(previewChime).toHaveBeenCalledOnce();
  });

  it('should request permission and turn Notifications on when granted', async () => {
    const requestPermission = stubNotification('default', 'granted');
    const user = userEvent.setup();
    render(<AlertSettings />);

    await user.click(screen.getByRole('switch', { name: 'Notifications' }));

    expect(requestPermission).toHaveBeenCalledOnce();
    expect(screen.getByRole('switch', { name: 'Notifications' })).toBeChecked();
    expect(window.localStorage.getItem('daily-focus:notificationsEnabled')).toBe('true');
  });

  it('should stay off and reveal the blocked message when permission is denied', async () => {
    stubNotification('default', 'denied');
    const user = userEvent.setup();
    render(<AlertSettings />);
    expect(screen.getByText(BLOCKED)).toBeInTheDocument();
    expect(isBlockedMessageOpen()).toBe(false);

    await user.click(screen.getByRole('switch', { name: 'Notifications' }));

    expect(screen.getByRole('switch', { name: 'Notifications' })).not.toBeChecked();
    expect(window.localStorage.getItem('daily-focus:notificationsEnabled')).toBeNull();
    expect(isBlockedMessageOpen()).toBe(true);
  });

  it('should turn Notifications off', async () => {
    stubNotification('granted', 'granted');
    window.localStorage.setItem('daily-focus:notificationsEnabled', 'true');
    const user = userEvent.setup();
    render(<AlertSettings />);
    const notifications = screen.getByRole('switch', { name: 'Notifications' });
    expect(notifications).toBeChecked();

    await user.click(notifications);

    expect(notifications).not.toBeChecked();
    expect(window.localStorage.getItem('daily-focus:notificationsEnabled')).toBe('false');
  });

  it('should show Notifications off when it was enabled but permission is no longer granted', () => {
    stubNotification('denied', 'denied');
    window.localStorage.setItem('daily-focus:notificationsEnabled', 'true');
    render(<AlertSettings />);

    expect(screen.getByRole('switch', { name: 'Notifications' })).not.toBeChecked();
    expect(isBlockedMessageOpen()).toBe(true);
  });

  it('should explain missing support and hide the Notifications switch', () => {
    vi.stubGlobal('Notification', undefined);
    delete (window as { Notification?: unknown }).Notification;
    render(<AlertSettings />);

    expect(screen.getByText('This browser does not support notifications.')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Notifications' })).toBeNull();
    expect(screen.getByRole('switch', { name: 'Sound' })).toBeInTheDocument();
  });
});
