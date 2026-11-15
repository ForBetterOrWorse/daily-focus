import { useId, useMemo, useState, type ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@/components/base/icon';
import {
  FieldContext,
  FieldLabelContext,
  type FieldControlProps,
  type FieldLabel,
} from './field-context';
import styles from './field.module.css';

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required = false, children, className }: FieldProps) {
  const id = useId();
  const [shownError, setShownError] = useState(error);
  if (error && error !== shownError) {
    setShownError(error);
  }
  // Without a hint the error folds in and out, so its text outlives the error until the fold ends.
  const folds = !hint;
  const leaving = folds && !error && Boolean(shownError);
  const errorText = folds ? shownError : error;
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : '';

  const control = useMemo<FieldControlProps>(
    () => ({
      id,
      'aria-describedby': describedBy || undefined,
      'aria-invalid': error ? true : undefined,
      'aria-required': required ? true : undefined,
    }),
    [id, describedBy, error, required]
  );
  const fieldLabel = useMemo<FieldLabel>(() => ({ id: labelId, text: label }), [labelId, label]);

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label id={labelId} className={styles.label} htmlFor={id}>
        {label}
        {/* aria-required on the control announces the requirement, so the asterisk stays hidden. */}
        {required && (
          <span className={styles.required} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <FieldLabelContext.Provider value={fieldLabel}>
        <FieldContext.Provider value={control}>{children}</FieldContext.Provider>
      </FieldLabelContext.Provider>
      <div className={styles.messages} data-hint={hint ? '' : undefined}>
        {hint && (
          <p id={hintId} className={styles.hint} aria-hidden={error ? true : undefined}>
            {hint}
          </p>
        )}
        {/* The live region stays mounted so a screen reader announces the error when it arrives. */}
        <div
          id={errorId}
          className={styles.error}
          data-open={error ? '' : undefined}
          role="status"
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
          {errorText && (
            <span className={styles['error-clip']}>
              <span className={styles['error-body']} aria-hidden={error ? undefined : true}>
                <ExclamationTriangleIcon className={styles['error-icon']} />
                {errorText}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
