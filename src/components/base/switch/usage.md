---
summary: 'Use Switch for a setting that takes effect immediately when turned on or off.'
---

Use Switch for an on/off preference, not for choosing among several options.
It is controlled: pass the current `checked` value and update it in `onChange`.
Give it a short, persistent `label`; add `description` only when the effect
needs more explanation.

```tsx
<Switch
  checked={animationsEnabled}
  onChange={setAnimationsEnabled}
  label="Enable animations"
  description="When on, animations and transitions are applied."
/>
```

Use `labelPosition="start"` to place the label before the control. Avoid
changing the label to describe the opposite state; the switch state already
communicates whether the setting is on.

In Expressive and Tactile, the on track and handle use the theme's chosen-state
green. In Tactile, the track edge follows the fill.
