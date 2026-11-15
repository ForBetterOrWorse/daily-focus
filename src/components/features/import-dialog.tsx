import { useId, useState } from 'react';
import { Button } from '@/components/base/button/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Modal } from '@/components/base/modal/modal';
import { RadioGroup } from '@/components/base/radio-group/radio-group';
import { Stack } from '@/components/base/stack/stack';
import { countLabel } from '@/utils/count-label';
import { Fold } from './fold';
import styles from './import-dialog.module.css';

export type ImportMode = 'merge' | 'replace';

const LONG_DATE = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' });

const MODE_OPTIONS = [
  {
    value: 'merge',
    label: 'Merge',
    description: 'Keep both. Where an item changed in both, the newer change wins.',
  },
  {
    value: 'replace',
    label: 'Replace',
    description: "Use only the backup. This browser's current data is deleted.",
  },
];

export interface ImportDialogProps {
  open: boolean;
  fileName: string;
  items: number;
  sessions: number;
  exportedAt: number | null;
  triggerElement: HTMLElement | null;
  onCancel: () => void;
  onSubmit: (mode: ImportMode, exportFirst: boolean) => void;
}

export function ImportDialog({
  open,
  fileName,
  items,
  sessions,
  exportedAt,
  triggerElement,
  onCancel,
  onSubmit,
}: ImportDialogProps) {
  const titleId = useId();
  const [mode, setMode] = useState<ImportMode>('merge');
  const [exportFirst, setExportFirst] = useState(true);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMode('merge');
      setExportFirst(true);
    }
  }
  const replace = mode === 'replace';
  const summary = [
    exportedAt === null ? null : `Backed up ${LONG_DATE.format(exportedAt)}`,
    countLabel(items, 'item'),
    countLabel(sessions, 'session'),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Modal
      open={open}
      onClose={onCancel}
      closeLabel="Close"
      ariaLabelledBy={titleId}
      triggerElement={triggerElement}
    >
      <Modal.Header id={titleId}>Import backup</Modal.Header>
      <Modal.Body className={styles.body}>
        <p className={styles.file}>
          <span className={styles.name}>{fileName}</span>
          <span className={styles.summary}>{summary}</span>
        </p>
        <RadioGroup
          legend="This browser has data too"
          options={MODE_OPTIONS}
          value={mode}
          onChange={(value) => setMode(value === 'replace' ? 'replace' : 'merge')}
        />
        <Fold open={replace}>
          <Checkbox
            checked={exportFirst}
            onChange={setExportFirst}
            label="Export this browser's data first"
          />
        </Fold>
        <Stack justify="end">
          <Button type="button" variant="primary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={replace ? 'danger' : 'cta'}
            size="sm"
            onClick={() => onSubmit(mode, replace && exportFirst)}
          >
            {replace ? 'Replace data' : 'Merge'}
          </Button>
        </Stack>
      </Modal.Body>
    </Modal>
  );
}
