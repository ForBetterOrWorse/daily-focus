---
summary: 'Use ShortcutsModal to list the keyboard shortcuts available in the project.'
---

Use ShortcutsModal to show every keyboard shortcut in one dialog. Pass the list
as `shortcuts`, one `{ keys, action }` entry per shortcut, where `keys` holds
each key of the combination. Control it with `open` and `onClose` in the
parent, and pass the previously focused element as `triggerElement` to restore
focus when it closes.

```tsx
<ShortcutsModal
  open={shortcutsOpen}
  onClose={() => setShortcutsOpen(false)}
  shortcuts={[{ keys: ['Shift', 'S'], action: 'Start or pause the timer' }]}
  triggerElement={opener}
/>
```
