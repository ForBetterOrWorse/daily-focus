import type { InputHTMLAttributes, Ref } from 'react';
import { useFieldControl } from '@/components/base/field/field-context';
import controlStyles from '@/components/base/field/field-control.module.css';

export type TextInputType =
  'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number' | 'date';

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: TextInputType;
  ref?: Ref<HTMLInputElement>;
}

export function TextInput({
  type = 'text',
  className,
  disabled = false,
  name,
  readOnly,
  ...rest
}: TextInputProps) {
  const field = useFieldControl();

  return (
    <input
      type={type}
      className={[controlStyles.control, className].filter(Boolean).join(' ')}
      {...field}
      {...rest}
      name={disabled ? undefined : name}
      readOnly={disabled || readOnly}
      aria-disabled={disabled || undefined}
    />
  );
}
