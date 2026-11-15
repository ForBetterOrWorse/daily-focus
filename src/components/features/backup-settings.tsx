import { useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/base/button/button';
import { ExclamationTriangleIcon } from '@/components/base/icon';
import { Stack } from '@/components/base/stack/stack';
import { exportJson, importPreview } from '@/domain/backup';
import type { AppData } from '@/domain/types';
import { useAppData, useDispatch } from '@/store/use-app-data';
import { downloadText } from '@/utils/download';
import { countLabel } from '@/utils/count-label';
import styles from './backup-settings.module.css';
import { ImportDialog, type ImportMode } from './import-dialog';

const LONG_DATE = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' });
const NOT_A_BACKUP = "That file isn't a Daily Focus backup, so nothing changed.";

interface PendingImport {
  fileName: string;
  incoming: AppData;
  items: number;
  sessions: number;
  exportedAt: number | null;
}

interface ImportStatus {
  kind: 'done' | 'error';
  text: string;
}

async function readBackup(file: File) {
  try {
    return importPreview(JSON.parse(await file.text()));
  } catch {
    return { ok: false } as const;
  }
}

export function BackupSettings() {
  const data = useAppData((current) => current);
  const dispatch = useDispatch();
  const { lastExportAt } = data.meta;
  const fileInput = useRef<HTMLInputElement>(null);
  const [importButton, setImportButton] = useState<HTMLButtonElement | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);

  function exportBackup() {
    const { fileName, text } = exportJson(data, Date.now());
    downloadText(fileName, text, 'application/json');
    dispatch({ type: 'markExported' });
  }

  function showStatus(next: ImportStatus) {
    setStatus(next);
    setStatusOpen(true);
  }

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    setStatusOpen(false);
    const preview = await readBackup(file);
    if (!preview.ok) {
      showStatus({ kind: 'error', text: NOT_A_BACKUP });
      return;
    }
    setPending({
      fileName: file.name,
      incoming: preview.data,
      items: preview.items,
      sessions: preview.sessions,
      exportedAt: preview.exportedAt,
    });
    setDialogOpen(true);
  }

  function submitImport(mode: ImportMode, exportFirst: boolean) {
    if (!pending) {
      return;
    }
    if (exportFirst) {
      exportBackup();
    }
    dispatch({ type: 'importData', mode, incoming: pending.incoming });
    setDialogOpen(false);
    showStatus({
      kind: 'done',
      text: `Imported ${countLabel(pending.items, 'item')} and ${countLabel(pending.sessions, 'session')}.`,
    });
  }

  return (
    <Stack direction="column" gap="md">
      <p className={styles.meta}>
        {lastExportAt === null
          ? 'Last backup: never'
          : `Last backup: ${LONG_DATE.format(lastExportAt)}`}
      </p>
      <Stack gap="xs">
        <Button ref={setImportButton} variant="primary" onClick={() => fileInput.current?.click()}>
          Import backup
        </Button>
        <Button variant="cta" onClick={exportBackup}>
          Export backup
        </Button>
      </Stack>
      <input
        ref={fileInput}
        hidden
        type="file"
        accept="application/json,.json"
        aria-label="Backup file"
        onChange={pickFile}
      />
      <div role="status" className={styles.slot} data-open={statusOpen || undefined}>
        <div className={styles.fold} inert={!statusOpen} aria-hidden={!statusOpen}>
          <div className={styles.inner}>
            {status?.kind === 'error' ? (
              <p className={styles.error}>
                <ExclamationTriangleIcon className={styles['error-icon']} />
                {status.text}
              </p>
            ) : (
              <p className={styles.result}>{status?.text}</p>
            )}
          </div>
        </div>
      </div>
      <ImportDialog
        open={dialogOpen}
        fileName={pending?.fileName ?? ''}
        items={pending?.items ?? 0}
        sessions={pending?.sessions ?? 0}
        exportedAt={pending?.exportedAt ?? null}
        triggerElement={importButton}
        onCancel={() => setDialogOpen(false)}
        onSubmit={submitImport}
      />
    </Stack>
  );
}
