import { createContext, useContext } from 'react';

export interface FieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-required'?: true;
}

export interface FieldLabel {
  id: string;
  text: string;
}

export const FieldContext = createContext<FieldControlProps | null>(null);
export const FieldLabelContext = createContext<FieldLabel | null>(null);

/** Returns the id and ARIA wiring for the control inside a Field, or null outside one. */
export function useFieldControl(): FieldControlProps | null {
  return useContext(FieldContext);
}

/** Returns the Field's label id and text, for a control that names a popup after it. */
export function useFieldLabel(): FieldLabel | null {
  return useContext(FieldLabelContext);
}
