let lastInput: 'keyboard' | 'pointer' = 'pointer';
let tracking = false;

/** Starts recording whether the last input was the keyboard or a pointer. Safe to call many times. */
export function trackInputModality() {
  if (tracking || typeof document === 'undefined') {
    return;
  }
  tracking = true;
  document.addEventListener(
    'keydown',
    () => {
      lastInput = 'keyboard';
    },
    true
  );
  document.addEventListener(
    'pointerdown',
    () => {
      lastInput = 'pointer';
    },
    true
  );
}

export function lastInputWasKeyboard() {
  return lastInput === 'keyboard';
}
