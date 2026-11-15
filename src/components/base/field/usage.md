---
summary: 'Use Field to give one form control a visible label, an optional hint, and an error message.'
---

Wrap each TextInput, Textarea, or Select in a Field. Field renders the label,
hint, and error, and passes the control its id, `aria-describedby`,
`aria-invalid`, and `aria-required`, so the control needs no ids of its own.

```tsx
<Field label="Email" hint="We only use it for receipts." error={emailError} required>
  <TextInput type="email" autoComplete="email" value={email} onChange={onEmailChange} />
</Field>
```

The hint renders below the control. Use it to state a constraint, such as a
range, before the reader hits the error. Hint and error share one container
that stays mounted. With a hint set, the error takes the hint's place, so the
layout holds. Without a hint, the error grows in and folds away. The error sits
in a `role="status"` live region that exists before the error does, so a screen
reader announces it when it arrives, and the control's `aria-describedby` points
at the error while it shows.

Keep the label short and always visible, since a placeholder disappears once
the reader types. Write the error as the fix ("Enter an email with an @"), and
clear it as soon as the reader edits the field. On submit, move focus to the
first invalid control so its error is read. Checkbox and RadioGroup carry
their own labels.

A required field shows an asterisk after its label. The asterisk is hidden
from screen readers, which hear "required" from `aria-required` on the control.
Say once at the top of the form that an asterisk marks a required field.

An invalid field turns its label and edge red. A focused field shows its focus
with a 2px edge in place of the blue focus ring. In Expressive and Tactile, the
edge and caret use the theme's chosen-state green. An invalid field keeps its
red edge on focus and thickens it to 2px. A disabled field keeps its edge on
focus, so it shows the blue ring.
