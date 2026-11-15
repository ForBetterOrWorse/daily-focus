import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/base/button/button';
import { Drawer } from '@/components/base/drawer/drawer';
import { ToastProvider } from '@/components/base/toast/toast';
import { useToast } from '@/components/base/toast/toast-context';
import type { ItemInput } from '@/domain/items';
import type { DayKey, Group, Item } from '@/domain/types';
import { DeleteDialog } from './delete-dialog';
import { ItemForm } from './item-form';
import { ItemList } from './item-list';
import { LiveAnnouncerProvider } from './live-announcer';
import type { ItemFormProps } from './item-form';
import styles from './item-drawer.module.css';

export type DrawerView =
  { kind: 'list'; confirmDelete?: string } | { kind: 'form'; itemId?: string };

export interface ItemDrawerProps {
  open: boolean;
  kind: 'habit' | 'task';
  groups: Group[];
  items: Item[];
  start: DrawerView;
  triggerElement?: HTMLElement | null;
  day: DayKey;
  amountOf: (item: Item) => number;
  historyOf: (item: Item) => { trackedMs: number; days: number };
  onDelete: (itemId: string) => void;
  onReorder: (ids: string[]) => void;
  onSave: (itemId: string | undefined, item: ItemInput, today?: number) => void;
  onClose: () => void;
}

export function ItemDrawer({
  open,
  kind,
  groups,
  items,
  start,
  triggerElement,
  day,
  amountOf,
  onReorder,
  historyOf,
  onDelete,
  onSave,
  onClose,
}: ItemDrawerProps) {
  const [view, setView] = useState<DrawerView>(start);
  const [leavingId, setLeavingId] = useState<string>();
  const deleteFocus = useRef<HTMLElement | null>(null);
  const deleting = useRef<string | undefined>(undefined);
  const toast = useRef<ReturnType<typeof useToast> | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const rowButtons = useRef(new Map<string, HTMLButtonElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  const fromList = useRef(false);
  const returnTo = useRef<string | undefined>(undefined);
  const navigation = useRef<'form' | 'list' | null>(null);
  const startItemId = start.kind === 'form' ? start.itemId : undefined;
  const startConfirmDelete = start.kind === 'list' ? start.confirmDelete : undefined;

  useEffect(() => {
    if (open) {
      fromList.current = start.kind === 'list';
      returnTo.current = undefined;
      navigation.current = startConfirmDelete ? null : start.kind;
      setView(
        start.kind === 'form'
          ? { kind: 'form', itemId: startItemId }
          : { kind: 'list', confirmDelete: startConfirmDelete }
      );
    }
  }, [open, start.kind, startItemId, startConfirmDelete]);

  useLayoutEffect(() => {
    if (!open || navigation.current === null) {
      return;
    }
    if (navigation.current === 'form' && view.kind === 'form') {
      nameInput.current?.focus();
      navigation.current = null;
    } else if (navigation.current === 'list' && view.kind === 'list') {
      (returnTo.current
        ? rowButtons.current.get(`edit:${returnTo.current}`)
        : addButton.current
      )?.focus();
      navigation.current = null;
    }
  }, [open, view]);

  function openForm(itemId?: string) {
    if (leavingId) {
      return;
    }
    returnTo.current = itemId;
    fromList.current = true;
    navigation.current = 'form';
    setView({ kind: 'form', itemId });
  }

  function finish() {
    if (fromList.current) {
      navigation.current = 'list';
      setView({ kind: 'list' });
    } else {
      onClose();
    }
  }

  const pending =
    view.kind === 'list' && view.confirmDelete
      ? items.find((candidate) => candidate.id === view.confirmDelete)
      : undefined;
  const history = pending ? historyOf(pending) : undefined;
  let historyText: string | undefined;
  if (pending && history) {
    if (pending.completion === 'time' && history.trackedMs > 0) {
      const minutes = Math.max(1, Math.round(history.trackedMs / 60000));
      const hours = Math.floor(minutes / 60);
      const remainder = minutes % 60;
      historyText = `${hours ? `${hours} h${remainder ? ` ${remainder} min` : ''}` : `${minutes} min`} of tracked time`;
    } else if (history.days > 0) {
      historyText = `${history.days} ${history.days === 1 ? 'day' : 'days'} of history`;
    }
  }
  const lastDialog = useRef<{ title: string; summary?: string }>({ title: '' });
  const dialog = pending
    ? {
        title: `Delete ${pending.name}`,
        summary: historyText ? `Delete ${pending.name} and its ${historyText}.` : undefined,
      }
    : lastDialog.current;
  if (pending) {
    lastDialog.current = dialog;
  }

  function confirmDelete() {
    if (!pending) {
      return;
    }
    const index = items.findIndex((candidate) => candidate.id === pending.id);
    const next = items[index + 1];
    deleteFocus.current = next
      ? (rowButtons.current.get(`delete:${next.id}`) ?? null)
      : addButton.current;
    deleting.current = pending.id;
    setLeavingId(pending.id);
    setView({ kind: 'list' });
  }

  function finishDelete(itemId: string) {
    if (deleting.current !== itemId) {
      return;
    }
    deleting.current = undefined;
    const name = items.find((candidate) => candidate.id === itemId)?.name;
    setLeavingId(undefined);
    if (name) {
      onDelete(itemId);
      toast.current?.({ message: `${name} deleted`, tone: 'success' });
    }
  }

  const finishDeleteRef = useRef(finishDelete);
  finishDeleteRef.current = finishDelete;
  useEffect(() => {
    if (!leavingId) {
      return;
    }
    return () => finishDeleteRef.current(leavingId);
  }, [leavingId]);

  useEffect(() => {
    if (!open && leavingId) {
      finishDelete(leavingId);
    }
  });

  const item =
    view.kind === 'form' && view.itemId
      ? items.find((candidate) => candidate.id === view.itemId && candidate.kind !== 'quick')
      : undefined;
  const title =
    view.kind === 'list'
      ? `${kind === 'habit' ? 'Habits' : 'Tasks'}`
      : item
        ? item.name
        : `New ${kind}`;
  const formProps: ItemFormProps = {
    kind,
    groups,
    item,
    today: item?.completion === 'count' ? amountOf(item) : undefined,
    nameInput,
    onSave: (input, today) => {
      onSave(view.kind === 'form' ? view.itemId : undefined, input, today);
      finish();
    },
    onCancel: finish,
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        slideFrom="end"
        closeLabel="Close"
        title={title}
        initialFocus={nameInput}
        headerContent={
          view.kind === 'form' && fromList.current ? (
            <Button variant="ghost" onClick={finish}>
              All {kind}s
            </Button>
          ) : undefined
        }
        triggerElement={triggerElement}
      >
        <div className={styles.stage}>
          <ToastProvider position="top-center" scope="container">
            <ToastBridge toastRef={toast} />
            <div key={view.kind} className={`${styles.view} ${styles[view.kind]}`}>
              {view.kind === 'list' ? (
                <LiveAnnouncerProvider>
                  <ItemList
                    items={items}
                    groups={groups}
                    kind={kind}
                    day={day}
                    rowButtons={rowButtons}
                    addButton={addButton}
                    onOpen={openForm}
                    onDelete={(candidate) => {
                      if (!leavingId) {
                        setView({ kind: 'list', confirmDelete: candidate.id });
                      }
                    }}
                    leavingId={leavingId}
                    onLeft={finishDelete}
                    onReorder={(ids) => {
                      if (!leavingId) {
                        onReorder(ids);
                      }
                    }}
                  />
                </LiveAnnouncerProvider>
              ) : (
                <ItemForm key={view.itemId ?? 'new'} {...formProps} />
              )}
            </div>
          </ToastProvider>
        </div>
      </Drawer>
      {/* Mount the modal portal after the drawer has marked its background inert. */}
      {open ? (
        <DeleteDialog
          open={!!pending}
          title={dialog.title}
          summary={dialog.summary}
          triggerElement={
            pending
              ? rowButtons.current.get(`delete:${pending.id}`)
              : leavingId
                ? deleteFocus.current
                : undefined
          }
          onCancel={() => setView({ kind: 'list' })}
          onConfirm={confirmDelete}
        />
      ) : null}
    </>
  );
}

function ToastBridge({
  toastRef,
}: {
  toastRef: React.RefObject<ReturnType<typeof useToast> | null>;
}) {
  const showToast = useToast();
  useEffect(() => {
    toastRef.current = showToast;
    return () => {
      toastRef.current = null;
    };
  }, [showToast, toastRef]);
  return null;
}
