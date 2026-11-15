import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/base/button/button';
import { GearIcon } from '@/components/base/icon';
import { PillGroup } from '@/components/base/pill-group/pill-group';
import { Stack } from '@/components/base/stack/stack';
import { dayKeyOf } from '@/domain/days';
import {
  amountOn,
  goalOn,
  historyOf,
  displayName,
  isDoneOn,
  scheduledOn,
  type ItemSection as Section,
} from '@/domain/items';
import { HABIT_PRESETS, TASK_PRESETS, presetInput, presetLabel } from '@/domain/presets';
import type { Item } from '@/domain/types';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useAppData, useDispatch, useNow } from '@/store/use-app-data';
import { PlusLgIcon } from './app-icons';
import { useAnnounce } from './live-announcer';
import { ItemDrawer } from './item-drawer';
import { ItemTile } from './item-tile';
import styles from './item-section.module.css';

interface ItemSectionProps {
  section: Section;
  onEdit?: () => void;
  listOpen?: boolean;
  onNew?: () => void;
  newItemOpen?: boolean;
  onNewClose?: () => void;
}

export function ItemSection({
  section,
  onEdit,
  listOpen = false,
  onNew,
  newItemOpen = false,
  onNewClose,
}: ItemSectionProps) {
  const data = useAppData((value) => value);
  const dispatch = useDispatch();
  const now = useNow(1000);
  const announce = useAnnounce();
  const reducedMotion = useReducedMotion();
  const previousDone = useRef<Set<string> | null>(null);
  const celebrated = useRef(new Set<string>());
  const [celebrating, setCelebrating] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [revealing, setRevealing] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const gearButtonRef = useRef<HTMLButtonElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const day = dayKeyOf(now, data.settings.dayStartHour);
  const kind = section === 'habits' ? 'habit' : 'task';
  const title = section === 'habits' ? 'Habits' : 'Tasks';
  const items = data.order[section]
    .map((id) => data.items.find((item) => item.id === id))
    .filter((item): item is Item => item !== undefined && item.kind === kind);
  const todayItems = section === 'habits' ? items.filter((item) => scheduledOn(item, day)) : items;
  const doneKey = todayItems
    .filter((item) => isDoneOn(data, item, day, now))
    .map((item) => item.id)
    .join(',');
  const groups = [
    ...data.groups.map((group) => ({ id: group.id, name: group.name })),
    { id: null, name: '' },
  ]
    .map((group) => {
      const members = todayItems.filter((item) => item.groupId === group.id);
      if (section === 'tasks') {
        members.sort(
          (a, b) => Number(isDoneOn(data, a, day, now)) - Number(isDoneOn(data, b, day, now))
        );
      }
      return { ...group, members };
    })
    .filter((group) => group.members.length > 0);

  useEffect(() => {
    const current = new Set(doneKey === '' ? [] : doneKey.split(','));
    const previous = previousDone.current;
    previousDone.current = current;
    if (previous === null) {
      return;
    }
    const fresh = [...current].filter(
      (id) => !previous.has(id) && !celebrated.current.has(`${id}:${day}`)
    );
    fresh.forEach((id) => celebrated.current.add(`${id}:${day}`));
    setCelebrating((ids) => {
      const next = [...ids.filter((id) => current.has(id)), ...fresh];
      return next.length === ids.length && next.every((id, index) => id === ids[index])
        ? ids
        : next;
    });
    const names = fresh
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is Item => item !== undefined)
      .map((item) => `${displayName(item)} goal met`);
    if (names.length > 0) {
      announce(names.join('. '));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a change in done ids or the day can celebrate.
  }, [doneKey, day]);

  useEffect(() => {
    pickerRef.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus only when selection mode opens.
  }, [picked === null]);

  const presets = section === 'habits' ? HABIT_PRESETS : TASK_PRESETS;
  const picking = picked !== null;

  function finishPicking(add: boolean) {
    headingRef.current?.focus();
    if (add) {
      presets
        .filter((preset) => picked?.includes(preset.name))
        .forEach((preset) => {
          dispatch({ type: 'addItem', item: presetInput(preset, data.groups) });
        });
    }
    setRevealing(add && picked !== null && picked.length > 0);
    setPicked(null);
  }

  return (
    <section aria-labelledby={`${section}-heading`} className={styles.section}>
      <div className={styles.header}>
        <h2 id={`${section}-heading`} ref={headingRef} tabIndex={-1} className={styles.title}>
          {title}
        </h2>
        <Stack wrap={false}>
          {items.length > 0 ? (
            <Button
              ref={gearButtonRef}
              variant="ghost"
              icon={GearIcon}
              aria-label={`Edit ${section}`}
              onClick={onEdit}
            />
          ) : null}
          <Button
            ref={newButtonRef}
            variant="ghost"
            icon={PlusLgIcon}
            aria-label={`New ${kind}`}
            onClick={onNew}
          />
        </Stack>
      </div>
      <div
        className={styles['preset-fold']}
        data-open={items.length === 0}
        inert={items.length > 0}
        aria-hidden={items.length > 0}
      >
        <div className={styles['preset-content']}>
          {picked === null ? (
            <ul className={styles.presets} aria-label={`Common ${section}`}>
              {presets.map((preset) => (
                <li key={preset.name}>
                  <Button
                    variant="primary"
                    size="sm"
                    shape="round"
                    className={styles['preset-button']}
                    icon={PlusLgIcon}
                    onClick={() => setPicked([preset.name])}
                  >
                    {presetLabel(preset)}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div ref={pickerRef} className={styles.picker}>
              <PillGroup
                legend={`Common ${section}`}
                hideLegend
                size="sm"
                options={presets.map((preset) => ({
                  value: preset.name,
                  label: presetLabel(preset),
                  icon: PlusLgIcon,
                }))}
                value={picked}
                onChange={setPicked}
              />
            </div>
          )}
          <div
            className={styles['actions-fold']}
            data-open={picking}
            inert={!picking}
            aria-hidden={!picking}
          >
            <div className={styles['preset-content']}>
              <Stack wrap={false} justify="end" className={styles.actions}>
                <Button variant="ghost" onClick={() => finishPicking(false)}>
                  Cancel
                </Button>
                <Button
                  variant="cta"
                  disabled={picked?.length === 0}
                  onClick={() => finishPicking(true)}
                >
                  Done
                </Button>
              </Stack>
            </div>
          </div>
        </div>
      </div>
      {items.length > 0 && todayItems.length === 0 && section === 'habits' ? (
        <p className={styles.empty}>No habits today.</p>
      ) : null}
      <div className={styles.groups}>
        {groups.map((group) => (
          <div
            key={group.id ?? 'ungrouped'}
            className={styles.reveal}
            data-revealing={revealing}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) {
                setRevealing(false);
              }
            }}
          >
            <div className={styles.group}>
              {group.id === null ? null : <h3 className={styles['group-title']}>{group.name}</h3>}
              <ul
                className={styles.items}
                aria-label={group.id === null ? title : `${title}: ${group.name}`}
              >
                {group.members.map((item) => {
                  const amount = amountOn(data, item, day, now);
                  return (
                    <ItemTile
                      key={item.id}
                      item={item}
                      amount={item.completion === 'time' ? Math.floor(amount) : amount}
                      goal={goalOn(item, day) ?? undefined}
                      done={isDoneOn(data, item, day, now)}
                      celebrate={!reducedMotion && celebrating.includes(item.id)}
                      running={data.run?.itemId === item.id}
                      onTap={() => dispatch({ type: 'tapItem', itemId: item.id })}
                    />
                  );
                })}
              </ul>
            </div>
          </div>
        ))}
      </div>
      {onNew ? (
        <ItemDrawer
          open={newItemOpen || listOpen}
          kind={kind}
          groups={data.groups}
          items={items}
          start={listOpen ? { kind: 'list' } : { kind: 'form' }}
          triggerElement={
            listOpen ? gearButtonRef.current : newItemOpen ? newButtonRef.current : undefined
          }
          day={day}
          historyOf={(item) => historyOf(data, item)}
          onDelete={(itemId) => dispatch({ type: 'deleteItem', itemId })}
          onReorder={(ids) => dispatch({ type: 'reorder', section, ids })}
          amountOf={(item) => amountOn(data, item, day, now)}
          onSave={(itemId, input, today) => {
            dispatch(
              itemId
                ? { type: 'updateItem', itemId, item: input }
                : { type: 'addItem', item: input }
            );
            if (itemId && today !== undefined) {
              dispatch({ type: 'setTodayCount', itemId, count: today });
            }
          }}
          onClose={() => onNewClose?.()}
        />
      ) : null}
    </section>
  );
}
