import { useId, useState, type FormEvent, type RefObject } from 'react';
import { Button } from '@/components/base/button/button';
import { Drawer } from '@/components/base/drawer/drawer';
import { ExclamationTriangleIcon } from '@/components/base/icon';
import { Field } from '@/components/base/field/field';
import { PillGroup } from '@/components/base/pill-group/pill-group';
import { RadioGroup } from '@/components/base/radio-group/radio-group';
import { Select } from '@/components/base/select/select';
import { Stack } from '@/components/base/stack/stack';
import { TextInput } from '@/components/base/text-input/text-input';
import {
  MAX_COUNT_GOAL,
  MAX_TIME_GOAL_MINUTES,
  MIN_TIME_GOAL_MINUTES,
  maxGoal,
  minGoal,
  type ItemInput,
} from '@/domain/items';
import type { Group, Item, TimerStyle } from '@/domain/types';
import { Fold } from './fold';
import styles from './item-drawer.module.css';

const COMPLETION_OPTIONS = [
  { value: 'check', label: 'Check it off' },
  { value: 'count', label: 'Reach a count' },
  { value: 'time', label: 'Reach a time' },
];

const DEFAULT_TARGETS = { count: '5', time: '30' };

const TIMER_OPTIONS = [
  { value: 'sessions', label: 'Focus sessions', description: '25 min focus, then a 5 min break' },
  { value: 'free', label: 'Free run', description: 'Counts up until you stop' },
];

const DAY_OPTIONS = [
  { value: '0', label: 'Monday', shortLabel: 'M' },
  { value: '1', label: 'Tuesday', shortLabel: 'T' },
  { value: '2', label: 'Wednesday', shortLabel: 'W' },
  { value: '3', label: 'Thursday', shortLabel: 'T' },
  { value: '4', label: 'Friday', shortLabel: 'F' },
  { value: '5', label: 'Saturday', shortLabel: 'S' },
  { value: '6', label: 'Sunday', shortLabel: 'S' },
];

interface FormErrors {
  name?: string;
  target?: string;
  days?: string;
  doneToday?: string;
}

export interface ItemFormProps {
  kind: 'habit' | 'task';
  groups: Group[];
  item?: Item;
  today?: number;
  nameInput?: RefObject<HTMLInputElement | null>;
  onSave: (item: ItemInput, today?: number) => void;
  onCancel: () => void;
}

export function ItemForm({
  kind,
  groups,
  item,
  today,
  nameInput,
  onSave,
  onCancel,
}: ItemFormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [groupId, setGroupId] = useState(item ? (item.groupId ?? '') : '');
  const [completion, setCompletion] = useState<'check' | 'count' | 'time'>(
    item?.completion ?? 'check'
  );
  const [target, setTarget] = useState(
    item?.completion === 'check' || !item
      ? ''
      : String(item.goals[item.goals.length - 1]?.target ?? '')
  );
  const [timerStyle, setTimerStyle] = useState<TimerStyle>(item?.timerStyle ?? 'sessions');
  const [days, setDays] = useState<number[]>(
    item?.kind === 'habit' ? item.days : [0, 1, 2, 3, 4, 5, 6]
  );
  const [doneToday, setDoneToday] = useState(today === undefined ? '' : String(today));
  const [errors, setErrors] = useState<FormErrors>({});
  const daysErrorId = useId();
  const hasTarget = completion !== 'check';
  const canFixToday = item?.completion === 'count' && completion === 'count';
  const targetRangeText =
    completion === 'time'
      ? `a number of minutes from ${MIN_TIME_GOAL_MINUTES} to ${MAX_TIME_GOAL_MINUTES}`
      : `a count from 1 to ${MAX_COUNT_GOAL}`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    const parsedTarget = Number.parseInt(target, 10);
    const fixedToday = Number(doneToday);
    const nextErrors: FormErrors = {
      name: trimmed ? undefined : `Enter a name for the ${kind}`,
      target:
        hasTarget && !(parsedTarget >= minGoal(completion) && parsedTarget <= maxGoal(completion))
          ? `Enter ${targetRangeText}`
          : undefined,
      days: kind === 'habit' && days.length === 0 ? 'Pick at least one day' : undefined,
      doneToday:
        canFixToday &&
        !(Number.isInteger(fixedToday) && fixedToday >= 0 && fixedToday <= MAX_COUNT_GOAL)
          ? `Enter a count from 0 to ${MAX_COUNT_GOAL}`
          : undefined,
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.target || nextErrors.days || nextErrors.doneToday) {
      return;
    }

    const common =
      kind === 'habit'
        ? { name: trimmed, groupId: groupId || null, kind, days }
        : { name: trimmed, groupId: groupId || null, kind };
    const input: ItemInput =
      completion === 'check'
        ? { ...common, completion }
        : completion === 'count'
          ? { ...common, completion, target: parsedTarget }
          : { ...common, completion, target: parsedTarget, timerStyle };
    onSave(input, canFixToday ? fixedToday : undefined);
  }

  const groupOptions = [
    { value: '', label: 'No group' },
    ...groups.map((group) => ({ value: group.id, label: group.name })),
  ];
  const submitLabel = item ? 'Save changes' : kind === 'habit' ? 'Add habit' : 'Add task';

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Drawer.Body>
        <div className={styles.fields}>
          <Field label="Name" error={errors.name}>
            <TextInput
              ref={nameInput}
              value={name}
              autoComplete="off"
              onChange={(event) => {
                setName(event.currentTarget.value);
                setErrors((previous) => ({ ...previous, name: undefined }));
              }}
            />
          </Field>
          <Field label="Group">
            <Select options={groupOptions} value={groupId} onValueChange={setGroupId} />
          </Field>
          <RadioGroup
            legend="How is it done?"
            options={COMPLETION_OPTIONS}
            value={completion}
            onChange={(value) => {
              const next = value as typeof completion;
              setCompletion(next);
              if (
                next !== 'check' &&
                (target === '' || Object.values(DEFAULT_TARGETS).includes(target))
              ) {
                setTarget(DEFAULT_TARGETS[next]);
              }
              setErrors((previous) => ({ ...previous, target: undefined }));
            }}
          />
          <Fold open={hasTarget}>
            <Field
              label={completion === 'time' ? 'Minutes' : 'Times'}
              hint={
                completion === 'time'
                  ? `${MIN_TIME_GOAL_MINUTES} to ${MAX_TIME_GOAL_MINUTES} minutes`
                  : `1 to ${MAX_COUNT_GOAL}`
              }
              error={errors.target}
            >
              <TextInput
                className={styles.number}
                type="number"
                inputMode="numeric"
                min={minGoal(completion === 'time' ? 'time' : 'count')}
                max={maxGoal(completion === 'time' ? 'time' : 'count')}
                value={target}
                onChange={(event) => {
                  setTarget(event.currentTarget.value);
                  setErrors((previous) => ({ ...previous, target: undefined }));
                }}
              />
            </Field>
          </Fold>
          {item?.completion === 'count' ? (
            <Fold open={canFixToday}>
              <Field label="Done today" hint={`0 to ${MAX_COUNT_GOAL}`} error={errors.doneToday}>
                <TextInput
                  className={styles.number}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_COUNT_GOAL}
                  value={doneToday}
                  onChange={(event) => {
                    setDoneToday(event.currentTarget.value);
                    setErrors((previous) => ({ ...previous, doneToday: undefined }));
                  }}
                />
              </Field>
            </Fold>
          ) : null}
          <Fold open={completion === 'time'}>
            <RadioGroup
              legend="Timer"
              options={TIMER_OPTIONS}
              value={timerStyle}
              onChange={(value) => setTimerStyle(value as TimerStyle)}
            />
          </Fold>
          {kind === 'habit' ? (
            <div className={styles['day-field']}>
              <PillGroup
                legend="Days"
                options={DAY_OPTIONS}
                value={days.map(String)}
                onChange={(values) => {
                  setDays(values.map(Number));
                  setErrors((previous) => ({ ...previous, days: undefined }));
                }}
                aria-describedby={errors.days ? daysErrorId : undefined}
              />
              {errors.days ? (
                <p id={daysErrorId} className={styles.error}>
                  <ExclamationTriangleIcon className={styles['error-icon']} aria-hidden="true" />
                  {errors.days}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <Stack justify="end">
          <Button type="button" variant="primary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="cta">
            {submitLabel}
          </Button>
        </Stack>
      </Drawer.Footer>
    </form>
  );
}
