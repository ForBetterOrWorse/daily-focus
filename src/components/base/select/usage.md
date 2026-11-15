---
summary: 'Use Select to pick one option from a list of about five or more.'
---

Select is a button that opens a styled list of options. Place it inside a Field,
which names the button, the list, and the phone sheet. Outside a Field, pass
`aria-label`.

```tsx
<Field label="Course language">
  <Select
    options={[
      {
        label: 'Americas',
        options: [{ value: 'es', label: 'Spanish', description: '18 courses' }],
      },
      { label: 'Asia', options: [{ value: 'vi', label: 'Vietnamese' }] },
    ]}
    placeholder="Choose a language"
    value={language}
    onValueChange={setLanguage}
  />
</Field>
```

- `options` takes options, groups of options, or both. An option has `value`,
  `label`, and optional `description`, `icon`, and `disabled`. When options
  have icons, the icon leads each row and the check for the chosen one moves to
  the row's end.
- `iconOnly` shows only the chosen option's icon in the button, for a tight
  spot where the icon names the choice on its own. The label stays as the
  value screen readers announce. Give every option an icon.
- Use `value` with `onValueChange`, or `defaultValue` alone. An empty string
  means nothing is chosen and shows the placeholder.
- Pass `name` to submit the value with a form. `required` and form reset work
  through a hidden native select.

The list opens below the button and flips above near the bottom of the
screen and fades out when it closes; Expressive and Tactile also roll it up
toward the button. On a phone (coarse pointer under 768px) it rises from the
bottom as a sheet and slides back down when it closes. Arrow keys, Home, End, Page Up, and Page Down move; typing a letter
jumps to the next match; Enter or Space chooses; Escape and Tab close without
changing the value.

In Expressive and Tactile, the open control edge and the chosen option's ring
and check use the theme's chosen-state green.

With four or fewer options, use RadioGroup so every choice stays visible.
Select holds one value; use a group of Checkboxes to pick several. To filter
a long list by typing, use a combobox instead.
