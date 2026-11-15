---
summary: 'Use RadioGroup to pick exactly one option from two to four that should all stay visible.'
---

RadioGroup renders a `<fieldset>` whose `legend` names the question, plus one
native radio per option. It is controlled: pass `value` (or `null` before the
reader picks) and update it in `onChange`. Arrow keys move the choice, as
browsers do for any radio group.

```tsx
<RadioGroup
  legend="Digest"
  options={[
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly', description: 'Sent on Mondays.' },
  ]}
  value={digest}
  onChange={setDigest}
  error={digestError}
  required
/>
```

`hint` and `error` describe the whole group. The error fades in as its space
opens. When it clears, the message fades out and its space collapses before it
leaves the DOM, while `aria-describedby` drops it at once. Use Select for five or more
options. The chosen radio uses the state color and a heavier edge, so it reads
without color.
