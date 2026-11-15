---
summary: 'Use Checkbox to turn one option on or off as part of a form the reader submits.'
---

Checkbox is controlled: pass `checked` and update it in `onChange`. The whole
label row toggles it. Add `description` only when the label needs more context.

```tsx
<Checkbox checked={emailReplies} onChange={setEmailReplies} label="Email me replies" />
```

A `disabled` checkbox uses `aria-disabled`, so it stays focusable and screen
readers can find it. It ignores changes and leaves its `name` out of the
submitted form.

Use Switch for a setting that takes effect right away, and Checkbox for a
choice that waits for a submit button. Stack related checkboxes inside a
`<fieldset>` with a `<legend>` that names the group. In Expressive and Tactile,
a checked box uses a sage fill with dark green marks in light mode, and a deep
green fill with mint marks in dark mode. In Tactile, its edge and lip follow the
fill.
