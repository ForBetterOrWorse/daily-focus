import { flushSync } from 'react-dom';

export function withViewTransition(update: () => void) {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      flushSync(update);
    });
    return;
  }
  update();
}
