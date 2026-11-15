import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/base/button/button';
import { Modal } from '@/components/base/modal/modal';
import { Stack } from '@/components/base/stack/stack';
import styles from './delete-dialog.module.css';

interface DeleteDialogProps {
  open: boolean;
  title: string;
  summary?: string;
  onCancel: () => void;
  onConfirm: () => void;
  triggerElement?: HTMLElement | null;
}

export function DeleteDialog({
  open,
  title,
  summary,
  onCancel,
  onConfirm,
  triggerElement,
}: DeleteDialogProps) {
  const titleId = useId();
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) {
      cancelButton.current?.focus();
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      closeLabel="Close"
      ariaLabelledBy={titleId}
      initialFocus={cancelButton}
      triggerElement={triggerElement}
    >
      <Modal.Header id={titleId}>{title}</Modal.Header>
      <Modal.Body>
        <p className={styles.text}>{summary ? `${summary} ` : null}This can't be undone.</p>
        <Stack justify="end">
          <Button ref={cancelButton} variant="primary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </Stack>
      </Modal.Body>
    </Modal>
  );
}
