---
summary: 'Use KbdCombo to show a keyboard shortcut with platform-aware modifier labels.'
---

Use KbdCombo next to an action or in a shortcut reference to make the required
keys easy to scan. Pass keys in the order the reader presses them. The `Alt`
and `Cmd` labels resolve to the current platform's modifier names.

```tsx
<KbdCombo keys={['Cmd', 'Enter']} />
```

On macOS, symbol modifiers have no plus sign before the next key. `KbdCombo`
keeps a small gap between keys. Set `separateAll` when each key needs an
explicit separator, such as in a shortcut list. Use `minimal` for compact hints.
