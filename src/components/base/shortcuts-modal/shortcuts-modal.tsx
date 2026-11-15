import { KbdCombo } from '@/components/base/kbd-combo/kbd-combo';
import { Modal } from '@/components/base/modal/modal';
import styles from './shortcuts-modal.module.css';

export interface ShortcutEntry {
  keys: string[];
  action: string;
}

export interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
  shortcuts: ShortcutEntry[];
  triggerElement?: HTMLElement | null;
}

export function ShortcutsModal({ open, onClose, shortcuts, triggerElement }: ShortcutsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="close shortcuts"
      ariaLabelledBy="shortcuts-modal-title"
      panelClassName={styles.panel}
      triggerElement={triggerElement}
    >
      <Modal.Header id="shortcuts-modal-title">Keyboard shortcuts</Modal.Header>
      <Modal.Body>
        <dl className={styles.list}>
          {shortcuts.map((shortcut) => (
            <div key={shortcut.action} className={styles.row}>
              <dt className={styles.keys}>
                <KbdCombo keys={shortcut.keys} separateAll />
              </dt>
              <dd className={styles.action}>{shortcut.action}</dd>
            </div>
          ))}
        </dl>
      </Modal.Body>
    </Modal>
  );
}
