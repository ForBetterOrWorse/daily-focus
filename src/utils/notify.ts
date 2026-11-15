export type NotificationSupport = 'unsupported' | NotificationPermission;

export function notificationSupport(): NotificationSupport {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

/** Call only from a user gesture. */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.requestPermission();
}

export function showNotification(title: string, body: string): void {
  if (notificationSupport() !== 'granted') {
    return;
  }
  try {
    const notification = new window.Notification(title, {
      body,
      tag: 'daily-focus-phase-end',
      icon: '/pwa-192x192.png',
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Some browsers (Android Chrome) throw on the constructor; notifications are best-effort.
  }
}
