---
summary: 'Use Menu to offer a short list of actions behind one button.'
---

Menu is a button that opens a list of actions. It follows the WAI-ARIA menu
button pattern: the arrow keys, Home, End, and the first letter of an item move
focus; Enter runs the item; Escape closes the menu and returns focus to the
button.

```tsx
<Menu
  label="Actions"
  align="end"
  items={[
    { label: 'Rename', onSelect: startRename },
    { label: 'Duplicate', onSelect: duplicate },
    { label: 'Delete', onSelect: confirmDelete, danger: true },
  ]}
/>
```

Use Menu for actions only. For links to other pages, use a list of links in a
Disclosure or the navigation components. Keep labels short and distinct by
their first letter where you can. Mark a destructive item `danger` and confirm
it before it runs. Set `align="end"` when the button sits at the end of a row.

For one short single-choice setting where a RadioGroup does not fit, give every
item `checked`. Such a menu holds only the choices: a link or action to more
settings beside them nests settings inside settings. Pass `icon` to show only
an icon on the button; `label` then names it for screen readers.

An item's `icon` leads its label. Once any item has one, the check moves to the
end of the row, matching Select.

```tsx
<Menu
  label="Timer style"
  icon={GearIcon}
  align="end"
  items={[
    {
      label: 'Focus blocks',
      icon: <HourglassSplitIcon />,
      checked: focus,
      onSelect: () => setFocus(true),
    },
    {
      label: 'Free run',
      icon: <StopwatchIcon />,
      checked: !focus,
      onSelect: () => setFocus(false),
    },
  ]}
/>
```
