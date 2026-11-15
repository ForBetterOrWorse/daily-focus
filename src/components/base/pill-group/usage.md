---
summary: 'Use PillGroup to choose any number of options from a short visible set, such as topic filters or weekdays.'
---

Use PillGroup to choose any number of options from a short visible set, such as
topic filters or weekdays. It is controlled: pass the chosen `value` array and
update it in `onChange`, which receives the next array in `options` order.
Give the group a `legend`; set `hideLegend` when surrounding text already names
it.

Use RadioGroup to pick one of two to four options, Checkbox for items in a
submitted form list, and Switch for one setting.

In Expressive and Tactile looks, a chosen pill uses the theme's chosen-state
green. Its edge follows the fill, and in Tactile its lip is a darker shade of
the fill.

```tsx
<PillGroup
  legend="Repeat on"
  options={[
    { value: 'mon', label: 'Monday', shortLabel: 'M' },
    { value: 'tue', label: 'Tuesday', shortLabel: 'T' },
    { value: 'wed', label: 'Wednesday', shortLabel: 'W' },
  ]}
  value={days}
  onChange={setDays}
/>
```

An option with a `shortLabel` renders a square pill that shows the short label
while assistive technology reads the full `label`.
