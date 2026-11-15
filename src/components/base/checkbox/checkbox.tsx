import { useId } from 'react';
import styles from './checkbox.module.css';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  name,
  value,
  className,
}: CheckboxProps) {
  const descriptionId = useId();

  return (
    <div className={[styles.row, className].filter(Boolean).join(' ')}>
      <label className={styles.checkbox}>
        <span className={styles.box}>
          <input
            className={styles.input}
            type="checkbox"
            checked={checked}
            aria-disabled={disabled || undefined}
            name={disabled ? undefined : name}
            value={value}
            onChange={(event) => {
              if (!disabled) {
                onChange(event.currentTarget.checked);
              }
            }}
            aria-describedby={description ? descriptionId : undefined}
          />
          <svg className={styles.check} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M3.5 8.5 6.75 11.5 12.5 4.75" pathLength="1" />
          </svg>
        </span>
        <span className={styles.label}>{label}</span>
      </label>
      {description && (
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>
      )}
    </div>
  );
}
