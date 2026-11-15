import { useId, useState } from 'react';
import { ExclamationTriangleIcon } from '@/components/base/icon';
import { Stack } from '@/components/base/stack/stack';
import styles from './radio-group.module.css';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  legend: string;
  options: RadioOption[];
  value: string | null;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  name?: string;
  className?: string;
}

export function RadioGroup({
  legend,
  options,
  value,
  onChange,
  hint,
  error,
  required = false,
  name,
  className,
}: RadioGroupProps) {
  const id = useId();
  const [shownError, setShownError] = useState(error);
  if (error && error !== shownError) {
    setShownError(error);
  }
  const leaving = !error && Boolean(shownError);
  const groupName = name ?? id;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <fieldset
      className={[styles.group, className].filter(Boolean).join(' ')}
      aria-describedby={describedBy || undefined}
    >
      <legend className={styles.legend}>
        {legend}
        {/* A fieldset can't take aria-required, so the legend carries the requirement as text. */}
        {required && (
          <>
            {' '}
            <span className={styles.required} aria-hidden="true">
              *
            </span>
            <span className="sr-only">required</span>
          </>
        )}
      </legend>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      <Stack direction="column" gap="xxs">
        {options.map((option) => {
          const descriptionId = `${id}-${option.value}-description`;

          return (
            <div key={option.value} className={styles.option}>
              <label className={styles.radio}>
                <input
                  className={styles.input}
                  type="radio"
                  name={groupName}
                  value={option.value}
                  checked={value === option.value}
                  aria-disabled={option.disabled || undefined}
                  onChange={() => {
                    if (!option.disabled) {
                      onChange(option.value);
                    }
                  }}
                  aria-describedby={option.description ? descriptionId : undefined}
                />
                <span className={styles.label}>{option.label}</span>
              </label>
              {option.description && (
                <p id={descriptionId} className={styles.description}>
                  {option.description}
                </p>
              )}
            </div>
          );
        })}
      </Stack>
      {shownError && (
        <p
          id={errorId}
          className={`${styles.error} ${leaving ? styles.leaving : ''}`}
          aria-hidden={leaving || undefined}
          onTransitionEnd={(event) => {
            if (
              leaving &&
              event.target === event.currentTarget &&
              event.propertyName === 'opacity'
            ) {
              setShownError(undefined);
            }
          }}
        >
          <span className={styles['error-clip']}>
            <span className={styles['error-body']}>
              <ExclamationTriangleIcon className={styles['error-icon']} />
              {shownError}
            </span>
          </span>
        </p>
      )}
    </fieldset>
  );
}
