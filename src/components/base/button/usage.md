---
summary: 'Use Button for actions or links, choosing the variant by priority and risk.'
---

Use a native button for an action and pass `href` when the control navigates.
Choose `cta` for the view's key action, `primary` for a secondary action, and
`danger` for a destructive action. Keep one `cta` per view. In a group, put the
committing action last, at the inline end, with Cancel before it.

```tsx
<Button variant="cta" onClick={saveChanges}>
  Save changes
</Button>
```

Buttons are 32px tall by default. Set `size="sm"` (24px) for dense toolbars and
`size="lg"` (40px) for a roomy form or page action, and keep one size across a
group. On a touch screen, every size grows and the hit area reaches 44px.
Pass `icon` an icon component, such as `icon={GearIcon}`, and Button draws it and
sizes it for the button: 16px on `sm`, 20px on `md`, 24px on `lg`. An `icon` with no
children makes a square icon-only button, which needs a non-empty `aria-label`. With
children, the icon leads the label and the button takes no `aria-label`, so it never has
two names. The types enforce both rules. Do not size the icon in CSS or pass it as a child. In a row
of icon-only buttons, such as Edit and Delete, use the default `md` size for all of them.

Buttons are square by default: 4px corners in Standard, 12px in Expressive and
Tactile. Icon-only buttons are round by default. Set `shape="round"` or `shape="square"`
to choose either. Keep one shape across a group of text buttons.

```tsx
<Button variant="primary" shape="round">
  Start lesson
</Button>
```

For an on/off action such as pin or mute, make a `primary` button a toggle with
`aria-pressed`. Pressed, it takes the same fill and edge as a chosen PillGroup
pill. In Tactile, its lip is a darker shade of that fill. Keep the label the same
in both states; the fill and edge already show the state.

```tsx
<Button variant="primary" aria-pressed={pinned} onClick={() => setPinned(!pinned)}>
  Pin
</Button>
```

Buttons default to `type="button"`; set `type="submit"` inside a form when the
button submits it. When an action is unavailable, pass the `disabled` prop. The
button renders `aria-disabled="true"` and stays in the tab order, so screen reader
users can find it and hear that it is unavailable. It ignores clicks, Enter, and
Space, and it drops its hover and press styling.
For navigation, use a meaningful link destination rather than simulating a
button click.
