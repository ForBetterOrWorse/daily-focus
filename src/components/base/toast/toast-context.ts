import { createContext, useContext } from 'react';

export type ToastTone = 'neutral' | 'success' | 'danger' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  /** Fills the toast with the tone's color. `neutral` keeps the plain surface. Defaults to `neutral`. */
  tone?: ToastTone;
  /** Shows the tone's icon. Defaults to `true`; a `neutral` toast has no icon. Turn it off only when the message names the outcome. */
  icon?: boolean;
  /** Milliseconds before the toast hides itself; `null` keeps it until dismissed. Danger and warning toasts default to `null`. */
  duration?: number | null;
  /** One text action, such as Undo. Running it also dismisses the toast. */
  action?: ToastAction;
}

export interface ToastAction {
  label: string;
  onAction: () => void;
}

/** Shows a toast and returns a function that dismisses it early. */
export type ShowToast = (options: ToastOptions) => () => void;

export const ToastContext = createContext<ShowToast | null>(null);

/** Returns `showToast`. Call it inside a ToastProvider. */
export function useToast(): ShowToast {
  const showToast = useContext(ToastContext);
  if (!showToast) {
    throw new Error('useToast must be called inside a ToastProvider.');
  }
  return showToast;
}
