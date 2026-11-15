import { Link as RouterLink } from 'wouter';
import { Banner } from '@/components/base/banner/banner';
import { Link } from '@/components/base/link/link';
import { hasTracked } from '@/domain/activity';
import { useAppData, useDispatch, useNow } from '@/store/use-app-data';
import styles from './backup-banner.module.css';

const DAY_MS = 86_400_000;
const DUE_AFTER_DAYS = 7;
const BACKUP_HREF = '/settings#settings-backup';

function wholeDays(from: number, to: number): number {
  return Math.floor((to - from) / DAY_MS);
}

function gapText(lastExportAt: number | null, days: number): string {
  if (lastExportAt === null) {
    return 'you have not backed up yet';
  }
  return `the last backup was ${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export function BackupBanner() {
  const data = useAppData((value) => value);
  const dispatch = useDispatch();
  const now = useNow(60_000);
  const { firstUseAt, lastExportAt, bannerDismissedAt } = data.meta;
  const reference = lastExportAt ?? firstUseAt;
  const days = wholeDays(reference, now);
  const dismissedDays = bannerDismissedAt === null ? null : wholeDays(reference, bannerDismissedAt);
  const firstVisit = data.items.length === 0 && !hasTracked(data);
  const open =
    !firstVisit && days >= DUE_AFTER_DAYS && (dismissedDays === null || days > dismissedDays);

  return (
    <div className={styles.slot} data-open={open || undefined} inert={!open} aria-hidden={!open}>
      <div className={styles.inner}>
        <Banner
          ariaLabel="Backup reminder"
          onDismiss={() => dispatch({ type: 'dismissBackupBanner' })}
        >
          Your data lives only in this browser, and {gapText(lastExportAt, days)}.{' '}
          <Link href={BACKUP_HREF} linkComponent={RouterLink}>
            Back up in Settings
          </Link>
        </Banner>
      </div>
    </div>
  );
}
