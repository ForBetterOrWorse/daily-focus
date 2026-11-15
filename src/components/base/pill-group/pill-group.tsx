import type { ComponentType } from 'react';
import styles from './pill-group.module.css';

export interface PillOption {
  value: string;
  label: string;
  shortLabel?: string;
  /** Leads the label while the pill is unchosen and gives way to the chosen fill once it is chosen. */
  icon?: ComponentType<{ className?: string }>;
}

export interface PillGroupProps {
  legend: string;
  options: PillOption[];
  value: string[];
  onChange: (value: string[]) => void;
  hideLegend?: boolean;
  /** `sm` matches a small Button, for a group that stands in for a row of small buttons. */
  size?: 'sm' | 'md';
  className?: string;
  'aria-describedby'?: string;
}

export function PillGroup({
  legend,
  options,
  value,
  onChange,
  hideLegend = false,
  size = 'md',
  className,
  'aria-describedby': ariaDescribedBy,
}: PillGroupProps) {
  function toggle(optionValue: string, checked: boolean) {
    const next = new Set(value);
    if (checked) {
      next.add(optionValue);
    } else {
      next.delete(optionValue);
    }
    onChange(options.filter((option) => next.has(option.value)).map((option) => option.value));
  }

  return (
    <fieldset
      className={[styles.group, size === 'sm' ? styles.small : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-describedby={ariaDescribedBy}
    >
      <legend className={hideLegend ? 'sr-only' : styles.legend}>{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={[styles.pill, option.shortLabel ? styles.day : ''].filter(Boolean).join(' ')}
        >
          <input
            className={styles.input}
            type="checkbox"
            checked={value.includes(option.value)}
            onChange={(event) => toggle(option.value, event.currentTarget.checked)}
          />
          {option.shortLabel ? (
            <>
              <span aria-hidden="true">{option.shortLabel}</span>
              <span className="sr-only">{option.label}</span>
            </>
          ) : (
            <>
              {option.icon ? <option.icon className={styles.icon} /> : null}
              <span>{option.label}</span>
            </>
          )}
        </label>
      ))}
    </fieldset>
  );
}
