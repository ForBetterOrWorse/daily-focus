import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { Button } from '@/components/base/button/button';
import { Drawer } from '@/components/base/drawer/drawer';
import { Menu } from '@/components/base/menu/menu';
import { Stack } from '@/components/base/stack/stack';
import { goalText } from '@/domain/goal-text';
import { goalOn } from '@/domain/items';
import type { DayKey, Group, Item } from '@/domain/types';
import { GripVerticalIcon, PencilIcon, TrashIcon } from './app-icons';
import { useAnnounce } from './live-announcer';
import styles from './item-list.module.css';

export interface ItemListProps {
  items: Item[];
  groups: Group[];
  kind: 'habit' | 'task';
  day: DayKey;
  rowButtons: RefObject<Map<string, HTMLButtonElement>>;
  addButton: RefObject<HTMLButtonElement | null>;
  onOpen: (itemId?: string) => void;
  onDelete: (item: Item) => void;
  onReorder: (ids: string[]) => void;
  leavingId?: string;
  onLeft?: (itemId: string) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function details(item: Item, groups: Group[], day: DayKey) {
  const target = goalOn(item, day);
  return [
    groups.find((group) => group.id === item.groupId)?.name,
    goalText({
      completion: item.completion,
      timerStyle: item.timerStyle,
      target: target ?? undefined,
    }),
    item.kind === 'habit'
      ? item.days.length === 7
        ? 'Every day'
        : WEEKDAYS.filter((_, index) => item.days.includes(index)).join(', ')
      : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function ItemList({
  items,
  groups,
  kind,
  day,
  rowButtons,
  addButton,
  onOpen,
  onDelete,
  onReorder,
  leavingId,
  onLeft,
}: ItemListProps) {
  const list = useRef<HTMLUListElement>(null);
  const focusedGrip = useRef<HTMLElement | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const previousTops = useRef<Map<string, number> | null>(null);
  const activePointer = useRef<{
    itemId: string;
    pointerId: number;
    startY: number;
    dragging: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const announce = useAnnounce();
  const itemOrder = items.map((item) => item.id).join(' ');

  useLayoutEffect(() => {
    const tops = previousTops.current;
    previousTops.current = null;
    if (focusedGrip.current?.isConnected) {
      focusedGrip.current.focus();
    }
    focusedGrip.current = null;
    if (!tops || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)) {
      return;
    }
    for (const [id, row] of rows.current) {
      const shift = (tops.get(id) ?? row.offsetTop) - row.offsetTop;
      if (!shift || typeof row.animate !== 'function') {
        continue;
      }
      const [duration, ...easing] = getComputedStyle(row)
        .getPropertyValue('--motion-spatial-base')
        .trim()
        .split(' ');
      row.animate([{ translate: `0 ${shift}px` }, { translate: '0 0' }], {
        duration: Number.parseFloat(duration) || 0,
        easing: easing.join(' ') || 'ease-out',
      });
    }
  }, [itemOrder]);

  const onLeftRef = useRef(onLeft);
  onLeftRef.current = onLeft;
  useLayoutEffect(() => {
    if (!leavingId) {
      return;
    }
    const row = rows.current.get(leavingId);
    if (!row || typeof row.animate !== 'function') {
      onLeftRef.current?.(leavingId);
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const [duration] = getComputedStyle(row)
      .getPropertyValue('--motion-spatial-base')
      .trim()
      .split(' ');
    const animation = row.animate(
      reduced
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [
            { overflow: 'hidden', blockSize: `${row.offsetHeight}px`, opacity: 1 },
            { overflow: 'hidden', blockSize: '0px', paddingBlock: '0px', opacity: 0 },
          ],
      {
        duration: reduced ? 80 : Number.parseFloat(duration) || 200,
        easing: 'ease-in-out',
        fill: 'forwards',
      }
    );
    animation.onfinish = () => onLeftRef.current?.(leavingId);
    return () => animation.cancel();
  }, [leavingId]);

  function moveTo(itemId: string, index: number) {
    const from = items.findIndex((item) => item.id === itemId);
    if (from < 0 || from === index || index < 0 || index >= items.length) {
      return;
    }
    const next = items.map((item) => item.id).filter((id) => id !== itemId);
    next.splice(index, 0, itemId);
    previousTops.current = new Map([...rows.current].map(([id, row]) => [id, row.offsetTop]));
    const active = document.activeElement;
    focusedGrip.current =
      active instanceof HTMLElement &&
      active.matches('button[aria-haspopup="menu"]') &&
      rows.current.get(itemId)?.contains(active)
        ? active
        : null;
    onReorder(next);
    announce(`${items[from].name} moved to ${index + 1} of ${items.length}`);
  }

  function moveWithPointer(clientY: number) {
    const pointer = activePointer.current;
    if (!pointer?.dragging || !list.current) {
      return;
    }
    const position = clientY - list.current.getBoundingClientRect().top;
    const index = items.filter((item) => {
      if (item.id === pointer.itemId) {
        return false;
      }
      const row = rows.current.get(item.id);
      if (!row) {
        return false;
      }
      return row.offsetTop + row.offsetHeight / 2 < position;
    }).length;
    moveTo(pointer.itemId, index);
  }
  const latestMove = useRef(moveWithPointer);
  latestMove.current = moveWithPointer;

  useEffect(() => {
    function move(event: globalThis.PointerEvent) {
      const pointer = activePointer.current;
      if (!pointer || event.pointerId !== pointer.pointerId) {
        return;
      }
      if (!pointer.dragging && Math.abs(event.clientY - pointer.startY) >= 5) {
        pointer.dragging = true;
        setDraggingId(pointer.itemId);
      }
      if (pointer.dragging) {
        event.preventDefault();
        latestMove.current(event.clientY);
      }
    }
    function end(event: globalThis.PointerEvent) {
      const pointer = activePointer.current;
      if (!pointer || event.pointerId !== pointer.pointerId) {
        return;
      }
      suppressClick.current = pointer.dragging;
      activePointer.current = null;
      setDraggingId(null);
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
    function cancel(event: globalThis.PointerEvent) {
      if (event.pointerId !== activePointer.current?.pointerId) {
        return;
      }
      activePointer.current = null;
      setDraggingId(null);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel);
    };
  }, []);

  function startDrag(event: PointerEvent<HTMLDivElement>, itemId: string) {
    if (
      event.button !== 0 ||
      !(event.target instanceof Element) ||
      !event.target.closest('button[aria-haspopup="menu"]')
    ) {
      return;
    }
    activePointer.current = {
      itemId,
      pointerId: event.pointerId,
      startY: event.clientY,
      dragging: false,
    };
  }
  function captureClick(event: MouseEvent<HTMLDivElement>) {
    if (suppressClick.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = false;
    }
  }
  function gripKey(event: KeyboardEvent<HTMLDivElement>, itemId: string, index: number) {
    if (
      (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') ||
      (event.target instanceof Element && event.target.closest('[role="menu"]'))
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    moveTo(itemId, index + (event.key === 'ArrowUp' ? -1 : 1));
  }

  return (
    <>
      <Drawer.Body>
        <ul ref={list} className={styles.list} aria-label={`Your ${kind}s`}>
          {items.map((item, index) => (
            <li
              key={item.id}
              ref={(row) => {
                if (row) {
                  rows.current.set(item.id, row);
                } else {
                  rows.current.delete(item.id);
                }
              }}
              className={styles.row}
              data-dragging={draggingId === item.id || undefined}
              inert={leavingId === item.id || undefined}
            >
              <div className={styles['row-text']}>
                <span className={styles.name}>{item.name}</span>
                {details(item, groups, day) ? (
                  <span className={styles.meta}>{details(item, groups, day)}</span>
                ) : null}
              </div>
              <Stack wrap={false}>
                <Button
                  ref={(button) => {
                    if (button) {
                      rowButtons.current.set(`edit:${item.id}`, button);
                    } else {
                      rowButtons.current.delete(`edit:${item.id}`);
                    }
                  }}
                  variant="ghost"
                  icon={PencilIcon}
                  aria-label={`Edit ${item.name}`}
                  onClick={() => onOpen(item.id)}
                />
                <Button
                  ref={(button) => {
                    if (button) {
                      rowButtons.current.set(`delete:${item.id}`, button);
                    } else {
                      rowButtons.current.delete(`delete:${item.id}`);
                    }
                  }}
                  variant="ghost"
                  icon={TrashIcon}
                  aria-label={`Delete ${item.name}`}
                  onClick={() => onDelete(item)}
                />
                {items.length > 1 ? (
                  <div
                    className={styles.grip}
                    onPointerDownCapture={(event) => startDrag(event, item.id)}
                    onClickCapture={captureClick}
                    onKeyDownCapture={(event) => gripKey(event, item.id, index)}
                  >
                    <Menu
                      variant="ghost"
                      label={`Move ${item.name}. Drag to reorder, or use the up and down arrow keys`}
                      icon={GripVerticalIcon}
                      align="end"
                      items={[
                        {
                          label: 'Move up',
                          disabled: index === 0,
                          onSelect: () => moveTo(item.id, index - 1),
                        },
                        {
                          label: 'Move down',
                          disabled: index === items.length - 1,
                          onSelect: () => moveTo(item.id, index + 1),
                        },
                      ]}
                    />
                  </div>
                ) : null}
              </Stack>
            </li>
          ))}
        </ul>
        {items.length === 0 ? <p className={styles.empty}>No {kind}s yet.</p> : null}
      </Drawer.Body>
      <Drawer.Footer>
        <Stack justify="end">
          <Button ref={addButton} variant="primary" onClick={() => onOpen()}>
            Add a {kind}
          </Button>
        </Stack>
      </Drawer.Footer>
    </>
  );
}
