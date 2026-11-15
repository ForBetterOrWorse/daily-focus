import { afterEach, describe, expect, it, vi } from 'vitest';
import { notificationSupport, requestNotificationPermission, showNotification } from './notify';

interface FakeNotificationInstance {
  title: string;
  options?: NotificationOptions;
  onclick: (() => void) | null;
  close: ReturnType<typeof vi.fn>;
}

function installFakeNotification(permission: NotificationPermission, throws = false) {
  const instances: FakeNotificationInstance[] = [];

  class FakeNotification {
    static permission = permission;
    static requestPermission = vi.fn(() => Promise.resolve<NotificationPermission>('granted'));
    onclick: (() => void) | null = null;
    close = vi.fn();
    constructor(
      public title: string,
      public options?: NotificationOptions
    ) {
      if (throws) {
        throw new TypeError('Illegal constructor');
      }
      instances.push(this);
    }
  }

  vi.stubGlobal('Notification', FakeNotification);
  return { FakeNotification, instances };
}

function removeNotification() {
  vi.stubGlobal('Notification', undefined);
  Reflect.deleteProperty(window, 'Notification');
}

describe('notify', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('notificationSupport', () => {
    it('should report unsupported when Notification is missing', () => {
      removeNotification();

      expect(notificationSupport()).toBe('unsupported');
    });

    it('should report the current permission', () => {
      installFakeNotification('denied');

      expect(notificationSupport()).toBe('denied');
    });
  });

  describe('requestNotificationPermission', () => {
    it('should resolve unsupported when Notification is missing', async () => {
      removeNotification();

      await expect(requestNotificationPermission()).resolves.toBe('unsupported');
    });

    it('should resolve the permission the browser returns', async () => {
      const { FakeNotification } = installFakeNotification('default');

      await expect(requestNotificationPermission()).resolves.toBe('granted');
      expect(FakeNotification.requestPermission).toHaveBeenCalledOnce();
    });
  });

  describe('showNotification', () => {
    it('should do nothing when Notification is missing', () => {
      removeNotification();

      expect(() => {
        showNotification('Title', 'Body');
      }).not.toThrow();
    });

    it('should not create a notification when permission is denied', () => {
      const { instances } = installFakeNotification('denied');

      showNotification('Title', 'Body');

      expect(instances).toHaveLength(0);
    });

    it('should create a notification when permission is granted', () => {
      const { instances } = installFakeNotification('granted');

      showNotification('Reading', 'Focus 1 done. Break next.');

      expect(instances).toHaveLength(1);
      expect(instances[0].title).toBe('Reading');
      expect(instances[0].options).toEqual({
        body: 'Focus 1 done. Break next.',
        tag: 'daily-focus-phase-end',
        icon: '/pwa-192x192.png',
      });
    });

    it('should focus the window and close the notification on click', () => {
      const { instances } = installFakeNotification('granted');
      const focus = vi.spyOn(window, 'focus').mockImplementation(() => {});

      showNotification('Title', 'Body');
      instances[0].onclick?.();

      expect(focus).toHaveBeenCalledOnce();
      expect(instances[0].close).toHaveBeenCalledOnce();
    });

    it('should swallow an error thrown by the constructor', () => {
      installFakeNotification('granted', true);

      expect(() => {
        showNotification('Title', 'Body');
      }).not.toThrow();
    });
  });
});
