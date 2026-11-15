import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { Button } from '@/components/base/button/button';
import { Field } from '@/components/base/field/field';
import { Menu } from '@/components/base/menu/menu';
import { Stack } from '@/components/base/stack/stack';
import { TextInput } from '@/components/base/text-input/text-input';
import { useToast } from '@/components/base/toast/toast-context';
import { groupNameError } from '@/domain/groups';
import type { AppData, Group } from '@/domain/types';
import { useAppData, useDispatch } from '@/store/use-app-data';
import { PencilIcon } from './app-icons';
import { Fold } from './fold';
import styles from './group-settings.module.css';

const ROW_TRANSITION_MS = 200;
const ROW_TRANSITION_FALLBACK_MS = ROW_TRANSITION_MS + 100;

type RowPhase = 'closed' | 'open' | 'settled';

interface LeavingGroup {
  group: Group;
  count: number;
  index: number;
}

function selectData(data: AppData): AppData {
  return data;
}

function itemCountText(count: number): string {
  if (count === 0) {
    return 'No items';
  }
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

interface GroupFormProps {
  group?: Group;
  data: AppData;
  focusOnMount: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}

function GroupForm({ group, data, focusOnMount, onSave, onCancel }: GroupFormProps) {
  const [name, setName] = useState(group?.name ?? '');
  const [error, setError] = useState<string | undefined>(undefined);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnMount) {
      input.current?.focus({ preventScroll: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the mount that opens the form takes focus.
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = groupNameError(data, name, group?.id);
    if (message) {
      setError(message);
      return;
    }
    onSave(name.trim());
  }

  return (
    // eslint-disable-next-line jsx-a11y-x/no-noninteractive-element-interactions -- Escape cancels the form, as in a dialog.
    <form
      className={styles.form}
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onCancel();
        }
      }}
      noValidate
    >
      <Field
        label={group ? `Rename ${group.name}` : 'New group'}
        error={error}
        className={styles['group-field']}
      >
        <TextInput
          ref={input}
          value={name}
          autoComplete="off"
          onChange={(event) => {
            setName(event.currentTarget.value);
            setError(undefined);
          }}
        />
      </Field>
      <Stack justify="end">
        <Button type="button" variant="primary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="cta" size="sm">
          {group ? 'Save' : 'Add group'}
        </Button>
      </Stack>
    </form>
  );
}

interface GroupRowProps {
  id: string;
  animateIn: boolean;
  leaving: boolean;
  rowRef: (element: HTMLLIElement | null) => void;
  onExited: (id: string) => void;
  children: ReactNode;
}

function GroupRow({ id, animateIn, leaving, rowRef, onExited, children }: GroupRowProps) {
  const [phase, setPhase] = useState<RowPhase>(animateIn ? 'closed' : 'settled');
  const state = leaving ? 'exiting' : phase;

  useEffect(() => {
    if (state !== 'closed') {
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPhase('open'));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [state]);

  function finish() {
    if (state === 'exiting') {
      onExited(id);
    } else if (state === 'open') {
      setPhase('settled');
    }
  }

  useEffect(() => {
    if (state !== 'open' && state !== 'exiting') {
      return;
    }
    const timer = setTimeout(finish, ROW_TRANSITION_FALLBACK_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the timer restarts only when the state changes.
  }, [state]);

  return (
    <li
      ref={rowRef}
      className={styles.row}
      data-state={state}
      inert={leaving}
      aria-hidden={leaving || undefined}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget) {
          finish();
        }
      }}
    >
      <div className={styles.clip}>{children}</div>
    </li>
  );
}

interface GroupSettingsProps {
  adding: boolean;
  onAddingChange: (open: boolean) => void;
  addButtonRef: RefObject<HTMLButtonElement | null>;
}

export function GroupSettings({ adding, onAddingChange, addButtonRef }: GroupSettingsProps) {
  const data = useAppData(selectData);
  const dispatch = useDispatch();
  const showToast = useToast();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [session, setSession] = useState(0);
  const [wasAdding, setWasAdding] = useState(adding);
  const [leaving, setLeaving] = useState<LeavingGroup[]>([]);
  const initialIds = useRef(new Set(data.groups.map((group) => group.id)));
  const rows = useRef(new Map<string, HTMLLIElement>());
  const returnFocus = useRef<(() => HTMLElement | null) | null>(null);

  if (adding !== wasAdding) {
    setWasAdding(adding);
    if (adding) {
      setSession((current) => current + 1);
      setRenamingId(null);
    }
  }

  useEffect(() => {
    if (renamingId === null && !adding && returnFocus.current) {
      returnFocus.current()?.focus();
      returnFocus.current = null;
    }
  });

  function startRename(groupId: string) {
    setSession((current) => current + 1);
    setRenamingId(groupId);
    onAddingChange(false);
  }

  function close(target: () => HTMLElement | null) {
    returnFocus.current = target;
    setRenamingId(null);
    onAddingChange(false);
  }

  function menuTrigger(groupId: string) {
    return () => rows.current.get(groupId)?.querySelector('button') ?? null;
  }

  function remove(group: Group, count: number, index: number) {
    dispatch({ type: 'removeGroup', groupId: group.id });
    setLeaving((current) => [...current, { group, count, index }]);
    showToast({
      message: `${group.name} removed`,
      action: { label: 'Undo', onAction: () => dispatch({ type: 'restore', snapshot: data }) },
    });
    returnFocus.current = () => addButtonRef.current;
    setRenamingId(null);
    onAddingChange(false);
  }

  function exited(groupId: string) {
    setLeaving((current) => current.filter((entry) => entry.group.id !== groupId));
  }

  const present = new Set(data.groups.map((group) => group.id));
  const listed = data.groups.map((group, index) => ({
    group,
    count: data.items.filter((item) => item.groupId === group.id).length,
    index,
    leaving: false,
  }));
  [...leaving]
    .filter((entry) => !present.has(entry.group.id))
    .sort((a, b) => a.index - b.index)
    .forEach((entry) => {
      listed.splice(entry.index, 0, { ...entry, leaving: true });
    });

  return (
    <div className={styles.groups}>
      <ul className={styles.rows}>
        {listed.map(({ group, count, leaving: isLeaving }) => {
          const renaming = renamingId === group.id && !adding;
          return (
            <GroupRow
              key={group.id}
              id={group.id}
              animateIn={!initialIds.current.has(group.id)}
              leaving={isLeaving}
              onExited={exited}
              rowRef={(element) => {
                if (element) {
                  rows.current.set(group.id, element);
                } else {
                  rows.current.delete(group.id);
                }
              }}
            >
              <div className={styles.swap}>
                <div
                  className={styles['swap-face']}
                  data-hidden={renaming || undefined}
                  inert={renaming}
                >
                  <div className={styles['row-text']}>
                    <span className={styles['row-name']}>{group.name}</span>
                    <span className={styles['row-meta']}>{itemCountText(count)}</span>
                  </div>
                  <Menu
                    label={`Edit ${group.name}`}
                    icon={PencilIcon}
                    variant="ghost"
                    size="md"
                    align="end"
                    items={[
                      { label: 'Rename', onSelect: () => startRename(group.id) },
                      {
                        label: 'Remove',
                        onSelect: () =>
                          remove(
                            group,
                            count,
                            data.groups.findIndex((entry) => entry.id === group.id)
                          ),
                        danger: true,
                      },
                    ]}
                  />
                </div>
                <div className={styles['swap-form']}>
                  <Fold open={renaming}>
                    <GroupForm
                      key={session}
                      group={group}
                      data={data}
                      focusOnMount={renaming}
                      onSave={(name) => {
                        dispatch({ type: 'renameGroup', groupId: group.id, name });
                        close(menuTrigger(group.id));
                      }}
                      onCancel={() => close(menuTrigger(group.id))}
                    />
                  </Fold>
                </div>
              </div>
            </GroupRow>
          );
        })}
        <li className={styles['add-row']}>
          <Fold open={adding}>
            <div className={styles['form-row']}>
              <GroupForm
                key={session}
                data={data}
                focusOnMount={adding}
                onSave={(name) => {
                  dispatch({ type: 'addGroup', name });
                  close(() => addButtonRef.current);
                }}
                onCancel={() => close(() => addButtonRef.current)}
              />
            </div>
          </Fold>
        </li>
      </ul>
    </div>
  );
}
