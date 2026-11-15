import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { CaretDownFillIcon, CheckLgIcon } from '@/components/base/icon';
import { useFieldControl, useFieldLabel } from '@/components/base/field/field-context';
import controlStyles from '@/components/base/field/field-control.module.css';
import { useMediaQuery } from '@/hooks/use-media-query';
import { findTypeaheadMatch } from './typeahead';
import styles from './select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectProps {
  options: (SelectOption | SelectOptionGroup)[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** Shows only the chosen option's icon in the button. Its label stays as the spoken value. */
  iconOnly?: boolean;
  name?: string;
  form?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

interface Section {
  label?: string;
  start: number;
  options: SelectOption[];
}

const TYPEAHEAD_RESET_MS = 350;
const PAGE_STEP = 10;
const VIEWPORT_MARGIN_PX = 8;

export function Select({
  options,
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  placeholder,
  iconOnly = false,
  name,
  form,
  required,
  disabled,
  id,
  'aria-label': ariaLabel,
  className,
  ref,
}: SelectProps) {
  const field = useFieldControl();
  const fieldLabel = useFieldLabel();
  const baseId = useId();
  const listId = `${baseId}-list`;
  const sheetTitleId = `${baseId}-sheet-title`;

  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = controlledValue ?? uncontrolledValue;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const open = activeIndex !== null;
  const [commitMark, setCommitMark] = useState<'a' | 'b' | undefined>();

  const coarse = useMediaQuery('(pointer: coarse)');
  const wide = useMediaQuery('(min-width: 768px)');
  const sheet = coarse && !wide;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nativeRef = useRef<HTMLSelectElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const typeahead = useRef({ query: '', timer: 0 });
  const highlightPlaced = useRef(false);

  const { items, sections } = useMemo(() => flatten(options), [options]);
  const selectedIndex = items.findIndex((item) => item.value === value);
  const selected = selectedIndex === -1 ? null : items[selectedIndex];
  const hasIcons = items.some((item) => item.icon !== undefined);
  const showIconOnly = iconOnly && selected?.icon !== undefined;

  useLayoutEffect(() => {
    const list = listRef.current;
    const dialog = dialogRef.current;
    if (sheet && dialog) {
      if (open) {
        // Reopening during the exit cancels it.
        delete dialog.dataset.closing;
        if (!dialog.open) {
          dialog.showModal();
        }
      } else if (dialog.open) {
        // The sheet slides down first; handleSheetAnimationEnd closes it.
        dialog.dataset.closing = '';
      }
    }
    if (activeIndex === null) {
      highlightPlaced.current = false;
      return;
    }
    if (!sheet && list && triggerRef.current) {
      placeList(list, triggerRef.current);
    }
    const option = optionRefs.current[activeIndex];
    if (list && option) {
      placeHighlight(list, option, !highlightPlaced.current);
      highlightPlaced.current = true;
    }
    option?.focus();
  }, [activeIndex, open, sheet]);

  useEffect(() => {
    if (!open || sheet) {
      return;
    }
    function handlePointerDown(event: globalThis.PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setActiveIndex(null);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, sheet]);

  useEffect(() => {
    const formElement = nativeRef.current?.form;
    if (!formElement || controlledValue !== undefined) {
      return;
    }
    const handleReset = () => setUncontrolledValue(defaultValue);
    formElement.addEventListener('reset', handleReset);
    return () => formElement.removeEventListener('reset', handleReset);
  }, [controlledValue, defaultValue, name]);

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), []);

  function setTriggerRef(node: HTMLButtonElement | null) {
    triggerRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }

  function openAt(index: number | null) {
    if (index !== null) {
      setActiveIndex(index);
    }
  }

  function close(returnFocus: boolean) {
    setActiveIndex(null);
    typeahead.current.query = '';
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }

  function handleSheetAnimationEnd(event: AnimationEvent<HTMLDialogElement>) {
    const dialog = event.currentTarget;
    // The backdrop's animation also reports on the dialog, with pseudoElement set.
    if (event.target === dialog && !event.pseudoElement && dialog.dataset.closing !== undefined) {
      delete dialog.dataset.closing;
      dialog.close();
    }
  }

  function commit(index: number) {
    const item = items[index];
    if (item.disabled) {
      return;
    }
    if (item.value !== value) {
      if (controlledValue === undefined) {
        setUncontrolledValue(item.value);
      }
      setCommitMark((mark) => (mark === 'a' ? 'b' : 'a'));
      onValueChange?.(item.value);
    }
    close(true);
  }

  function step(from: number, direction: 1 | -1, distance = 1): number {
    const target = Math.min(Math.max(from + direction * distance, 0), items.length - 1);
    for (let index = target; index >= 0 && index < items.length; index += direction) {
      if (!items[index].disabled) {
        return index;
      }
    }
    for (let index = target; index !== from; index -= direction) {
      if (!items[index].disabled) {
        return index;
      }
    }
    return from;
  }

  function firstEnabled(): number | null {
    const index = items.findIndex((item) => !item.disabled);
    return index === -1 ? null : index;
  }

  function lastEnabled(): number | null {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (!items[index].disabled) {
        return index;
      }
    }
    return null;
  }

  function typeaheadTo(key: string, from: number): number | null {
    const state = typeahead.current;
    window.clearTimeout(state.timer);
    state.query += key;
    state.timer = window.setTimeout(() => {
      state.query = '';
    }, TYPEAHEAD_RESET_MS);
    return findTypeaheadMatch(items, from, state.query);
  }

  function isCharacterKey(event: KeyboardEvent) {
    return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        openAt(selected && !selected.disabled ? selectedIndex : firstEnabled());
        break;
      case 'ArrowUp':
        event.preventDefault();
        openAt(selected && !selected.disabled ? selectedIndex : lastEnabled());
        break;
      case 'Home':
        event.preventDefault();
        openAt(firstEnabled());
        break;
      case 'End':
        event.preventDefault();
        openAt(lastEnabled());
        break;
      default:
        if (isCharacterKey(event) && event.key !== ' ') {
          event.preventDefault();
          openAt(typeaheadTo(event.key, -1));
        }
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (activeIndex === null) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex(step(activeIndex, 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex(step(activeIndex, -1));
        break;
      case 'PageDown':
        event.preventDefault();
        setActiveIndex(step(activeIndex, 1, PAGE_STEP));
        break;
      case 'PageUp':
        event.preventDefault();
        setActiveIndex(step(activeIndex, -1, PAGE_STEP));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(firstEnabled() ?? activeIndex);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(lastEnabled() ?? activeIndex);
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        // Focus the trigger first so the browser's Tab moves on from the Select itself.
        triggerRef.current?.focus();
        close(false);
        break;
      case 'Enter':
        event.preventDefault();
        commit(activeIndex);
        break;
      default:
        if (event.key === ' ' && typeahead.current.query === '') {
          event.preventDefault();
          commit(activeIndex);
        } else if (isCharacterKey(event)) {
          event.preventDefault();
          const match = typeaheadTo(event.key, activeIndex);
          if (match !== null) {
            setActiveIndex(match);
          }
        }
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (open && !rootRef.current?.contains(event.relatedTarget as Node | null)) {
      close(false);
    }
  }

  function handleOptionPointerMove(event: PointerEvent<HTMLDivElement>, index: number) {
    if (event.pointerType === 'mouse' && index !== activeIndex && !items[index].disabled) {
      setActiveIndex(index);
    }
  }

  const labelledBy = fieldLabel?.id;
  const list = (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      tabIndex={-1}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : ariaLabel}
      className={styles.list}
      data-icons={hasIcons || undefined}
      hidden={!open}
      onKeyDown={handleListKeyDown}
    >
      {sections.map((section) => {
        const headingId = `${listId}-group-${section.start}`;
        const rows = section.options.map((option, offset) => {
          const index = section.start + offset;
          const optionId = `${listId}-option-${index}`;
          const isSelected = index === selectedIndex;
          // The listbox handles keys for every option, since focus roves between them.
          return (
            // eslint-disable-next-line jsx-a11y-x/click-events-have-key-events
            <div
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              id={optionId}
              role="option"
              tabIndex={-1}
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              aria-labelledby={`${optionId}-label`}
              aria-describedby={option.description ? `${optionId}-description` : undefined}
              className={styles.option}
              onClick={() => commit(index)}
              onPointerMove={(event) => handleOptionPointerMove(event, index)}
            >
              <span className={styles.check}>{isSelected && <CheckLgIcon />}</span>
              {option.icon && <span className={styles['option-icon']}>{option.icon}</span>}
              <span className={styles['option-text']}>
                <span id={`${optionId}-label`}>{option.label}</span>
                {option.description && (
                  <span id={`${optionId}-description`} className={styles.description}>
                    {option.description}
                  </span>
                )}
              </span>
            </div>
          );
        });

        if (section.label === undefined) {
          return rows;
        }
        return (
          <div key={headingId} role="group" aria-labelledby={headingId} className={styles.group}>
            <div id={headingId} className={styles['group-label']}>
              {section.label}
            </div>
            {rows}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={[styles.root, iconOnly && styles['icon-only'], className]
        .filter(Boolean)
        .join(' ')}
      onBlur={handleBlur}
    >
      <button
        ref={setTriggerRef}
        type="button"
        role="combobox"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-disabled={disabled || undefined}
        data-placeholder={selected ? undefined : ''}
        data-commit={commitMark}
        className={`${controlStyles.control} ${styles.trigger}`}
        onMouseDown={(event) => {
          // Keep focus in the open list. Safari and macOS Firefox do not focus a pressed button,
          // so the list would blur to the body and close, and the click would reopen it.
          if (open) {
            event.preventDefault();
          }
        }}
        onClick={() => {
          if (disabled) {
            return;
          }
          if (open) {
            close(true);
          } else {
            openAt(selected && !selected.disabled ? selectedIndex : firstEnabled());
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        {...field}
      >
        <span className={styles.value}>
          {selected?.icon && <span className={styles['option-icon']}>{selected.icon}</span>}
          <span className={showIconOnly ? 'sr-only' : styles['value-text']}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <CaretDownFillIcon className={styles.chevron} />
      </button>
      {sheet ? (
        // A click on the dialog itself lands on the backdrop; Escape closes through onCancel.
        // eslint-disable-next-line jsx-a11y-x/click-events-have-key-events, jsx-a11y-x/no-noninteractive-element-interactions
        <dialog
          ref={dialogRef}
          aria-labelledby={sheetTitleId}
          className={styles.sheet}
          onAnimationEnd={handleSheetAnimationEnd}
          onCancel={(event) => {
            event.preventDefault();
            close(true);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              close(true);
            }
          }}
        >
          <p id={sheetTitleId} className={styles['sheet-title']}>
            {fieldLabel?.text ?? ariaLabel}
          </p>
          {list}
        </dialog>
      ) : (
        list
      )}
      {name && (
        <select
          ref={nativeRef}
          className="sr-only"
          name={name}
          form={form}
          required={required}
          // eslint-disable-next-line no-restricted-syntax -- Hidden form mirror: a native disabled field is left out of form submission, and aria-hidden with tabIndex -1 keeps it out of focus.
          disabled={disabled}
          value={value}
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => {
            const next = event.currentTarget.value;
            if (controlledValue === undefined) {
              setUncontrolledValue(next);
            }
            onValueChange?.(next);
          }}
          onFocus={() => triggerRef.current?.focus()}
        >
          <option value="" />
          {items.map((item) => (
            // eslint-disable-next-line no-restricted-syntax -- Hidden form mirror option: mirrors the disabled state so the native select matches the visible list.
            <option key={item.value} value={item.value} disabled={item.disabled}>
              {item.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function flatten(entries: (SelectOption | SelectOptionGroup)[]) {
  const items: SelectOption[] = [];
  const sections: Section[] = [];
  let loose: Section | null = null;

  for (const entry of entries) {
    if ('options' in entry) {
      loose = null;
      sections.push({ label: entry.label, start: items.length, options: entry.options });
      items.push(...entry.options);
    } else {
      if (!loose) {
        loose = { start: items.length, options: [] };
        sections.push(loose);
      }
      loose.options.push(entry);
      items.push(entry);
    }
  }
  return { items, sections };
}

/** Moves the list's highlight behind the active option. `jump` places it without the glide. */
function placeHighlight(list: HTMLElement, option: HTMLElement, jump: boolean) {
  if (jump) {
    list.dataset.glide = 'jump';
  }
  list.style.setProperty('--select-highlight-offset', `${option.offsetTop}px`);
  list.style.setProperty('--select-highlight-block-size', `${option.offsetHeight}px`);
  if (jump) {
    // Apply the jump before the glide comes back, so the move itself does not animate.
    void list.offsetHeight;
    delete list.dataset.glide;
  }
}

/** Opens the list below the trigger, or above it when there is more room there. */
function placeList(list: HTMLElement, trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom - VIEWPORT_MARGIN_PX;
  const above = rect.top - VIEWPORT_MARGIN_PX;
  const side = list.scrollHeight > below && above > below ? 'top' : 'bottom';
  list.dataset.side = side;
  list.style.setProperty('--select-available-block-size', `${side === 'top' ? above : below}px`);
}
