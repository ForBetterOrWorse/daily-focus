import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  Button,
  type ButtonIcon,
  type ButtonSize,
  type ButtonVariant,
} from '@/components/base/button/button';
import { CaretDownFillIcon, CheckLgIcon } from '@/components/base/icon';
import styles from './menu.module.css';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Makes the item one choice of a single-choice group. `true` marks the current choice. */
  checked?: boolean;
  /** Leads the label. Once any item has an icon, the check moves after the label. */
  icon?: ReactNode;
}

export interface MenuProps {
  label: string;
  /** Shows only this icon on the trigger. `label` then becomes its accessible name. */
  icon?: ButtonIcon;
  items: MenuItem[];
  variant?: ButtonVariant;
  size?: ButtonSize;
  align?: 'start' | 'end';
  className?: string;
}

export function Menu({
  label,
  icon,
  items,
  variant = 'primary',
  size = 'md',
  align = 'start',
  className,
}: MenuProps) {
  const id = useId();
  const triggerId = `${id}-trigger`;
  const menuId = `${id}-menu`;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const open = activeIndex !== null;
  // Every item keeps the check's space once any item is a choice, so all labels line up.
  const hasChoices = items.some((item) => item.checked !== undefined);
  const hasIcons = items.some((item) => item.icon !== undefined);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (activeIndex !== null) {
      itemRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setActiveIndex(null);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  function closeAndReturnFocus() {
    setActiveIndex(null);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(items.length - 1);
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (activeIndex === null) {
      return;
    }
    const last = items.length - 1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex(activeIndex === last ? 0 : activeIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex(activeIndex === 0 ? last : activeIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(last);
        break;
      case 'Escape':
        event.preventDefault();
        closeAndReturnFocus();
        break;
      case 'Tab':
        setActiveIndex(null);
        break;
      default:
        if (event.key.length === 1 && /\S/.test(event.key)) {
          const match = findByFirstLetter(items, activeIndex, event.key);
          if (match !== null) {
            setActiveIndex(match);
          }
        }
    }
  }

  function selectItem(item: MenuItem) {
    if (item.disabled) {
      return;
    }
    closeAndReturnFocus();
    item.onSelect();
  }

  const triggerProps = {
    ref: triggerRef,
    id: triggerId,
    variant,
    size,
    'aria-haspopup': 'menu' as const,
    'aria-expanded': open,
    'aria-controls': menuId,
    onClick: () => setActiveIndex(open ? null : 0),
    onKeyDown: handleTriggerKeyDown,
  };

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')}>
      {icon === undefined ? (
        <Button {...triggerProps}>
          {label}
          <CaretDownFillIcon className={styles.chevron} />
        </Button>
      ) : (
        <Button
          {...triggerProps}
          borderless
          icon={icon}
          className={styles['icon-trigger']}
          aria-label={label}
        />
      )}
      <ul
        id={menuId}
        role="menu"
        aria-labelledby={triggerId}
        className={`${styles.menu} ${styles[align]}`}
        data-icons={hasIcons || undefined}
        hidden={!open}
        onKeyDown={handleMenuKeyDown}
      >
        {items.map((item, index) => {
          const check = (
            <span className={styles.check} data-checked={item.checked || undefined}>
              <CheckLgIcon />
            </span>
          );
          return (
            <li key={item.label} role="none">
              <button
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
                aria-checked={item.checked}
                tabIndex={-1}
                className={[styles.item, item.danger ? styles.danger : undefined]
                  .filter(Boolean)
                  .join(' ')}
                aria-disabled={item.disabled || undefined}
                onClick={() => selectItem(item)}
                onPointerMove={() => {
                  // The pointer owns the highlight while it moves, so the row it left loses it.
                  if (index !== activeIndex) {
                    setActiveIndex(index);
                  }
                }}
              >
                {hasIcons ? <span className={styles['item-icon']}>{item.icon}</span> : null}
                {hasChoices && !hasIcons ? check : null}
                <span className={styles.label}>{item.label}</span>
                {hasChoices && hasIcons ? check : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function findByFirstLetter(items: MenuItem[], from: number, key: string): number | null {
  const letter = key.toLowerCase();
  for (let step = 1; step <= items.length; step += 1) {
    const index = (from + step) % items.length;
    if (items[index].label.toLowerCase().startsWith(letter)) {
      return index;
    }
  }
  return null;
}
