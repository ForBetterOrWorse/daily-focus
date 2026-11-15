import { useState } from 'react';
import { Switch } from '@/components/base/switch/switch';
import { useAlertPreferences } from '@/hooks/use-alert-preferences';
import { previewChime } from '@/utils/chime';
import {
  notificationSupport,
  requestNotificationPermission,
  type NotificationSupport,
} from '@/utils/notify';
import styles from './alert-settings.module.css';
import { Fold } from './fold';

export function AlertSettings() {
  const { soundEnabled, notificationsEnabled, setSoundEnabled, setNotificationsEnabled } =
    useAlertPreferences();
  const [support, setSupport] = useState<NotificationSupport>(notificationSupport);

  function changeSound(enabled: boolean) {
    setSoundEnabled(enabled);
    if (enabled) {
      previewChime();
    }
  }

  async function changeNotifications(enabled: boolean) {
    if (!enabled) {
      setNotificationsEnabled(false);
      return;
    }
    const result = await requestNotificationPermission();
    setSupport(result);
    if (result === 'granted') {
      setNotificationsEnabled(true);
    }
  }

  return (
    <div className={styles.root}>
      <Switch
        checked={soundEnabled}
        onChange={changeSound}
        label="Sound"
        description="Play a chime when a session ends."
      />
      {support === 'unsupported' ? (
        <p className={styles.prose}>This browser does not support notifications.</p>
      ) : (
        <>
          <Switch
            checked={notificationsEnabled && support === 'granted'}
            onChange={changeNotifications}
            label="Notifications"
            description="Show a system notification when a session ends while the app is in the background."
          />
          <Fold open={support === 'denied'}>
            <p className={styles.prose}>
              Notifications are blocked for this site. Allow them in your browser&apos;s site
              settings, then turn this on.
            </p>
          </Fold>
        </>
      )}
    </div>
  );
}
