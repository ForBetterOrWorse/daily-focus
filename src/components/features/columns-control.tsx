import { Button } from '@/components/base/button/button';
import { ColumnsLayoutIcon, PlusLgIcon } from './app-icons';
import styles from './columns-control.module.css';

interface ColumnsControlProps {
  variant: 'invite' | 'toggle';
  open: boolean;
  controlsId: string;
  onToggle: () => void;
}

/** Both glyphs share one slot, so the plus fades into the panel icon as the label collapses. */
function ColumnsControlIcon({ className }: { className?: string }) {
  return (
    <span className={[className, styles['columns-glyph']].join(' ')}>
      <PlusLgIcon className={[styles['columns-icon'], styles['columns-plus']].join(' ')} />
      <ColumnsLayoutIcon
        className={[styles['columns-icon'], styles['columns-panel']].join(' ')}
        paneClassName={styles['columns-pane']}
      />
    </span>
  );
}

/**
 * One persistent button. As an invite it shows its label; once the columns have been chosen the
 * label collapses toward the inline end and it becomes the icon-only toggle in the same spot.
 */
export function ColumnsControl({ variant, open, controlsId, onToggle }: ColumnsControlProps) {
  const invite = variant === 'invite';

  return (
    <Button
      variant="primary"
      icon={ColumnsControlIcon}
      className={styles['columns-control']}
      data-variant={variant}
      aria-keyshortcuts={invite ? undefined : '\\'}
      title={
        invite ? undefined : open ? 'Hide habits and tasks (\\)' : 'Show habits and tasks (\\)'
      }
      aria-expanded={open}
      aria-controls={controlsId}
      onClick={onToggle}
    >
      <span className={styles['columns-label']} aria-hidden={invite ? undefined : true}>
        <span className={styles['columns-label-text']}>Add habits and tasks</span>
      </span>
      {invite ? null : <span className="sr-only">Habits and tasks</span>}
    </Button>
  );
}
