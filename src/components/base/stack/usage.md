---
summary: 'Use Stack to arrange siblings in a row or column with token gaps, such as a set of buttons.'
---

Stack arranges its children along one axis with a gap from the spacing scale. Use it for
every set of two or more buttons that sit next to each other, whether they are text buttons,
icon-only buttons, or a mix. The default gap is `--stack-gap` (8px), so spacing never varies
from screen to screen. Do not space siblings with margins or a gap of your own.

```tsx
<Stack justify="end">
  <Button variant="primary" onClick={cancel}>
    Cancel
  </Button>
  <Button variant="cta" type="submit">
    Save
  </Button>
</Stack>
```

One `Stack` covers rows and columns. Systems that split them (Atlassian `Stack` and `Inline`,
Mantine `Stack` and `Group`, Chakra `VStack` and `HStack`) double the names without adding
capability, while Polaris, Primer, Carbon, and Spectrum use one component with a direction.
`direction` is also where the responsive mode lives.

## Props

- `direction`: `row` (default), `column`, or `responsive`. `responsive` is a column that
  becomes a row from the 600px breakpoint. It is one named mode because Kestrel's CSS rules
  allow only fixed `min-width` breakpoints. Breakpoint objects, container queries, and JavaScript
  measuring (Spectrum `ButtonGroup`, Carbon `ButtonSet fluid`) are not used: they need a
  breakpoint map, a query-container ancestor, or a ResizeObserver.
- `gap`: `xs`, `sm` (default), `md`, `lg`, or `xl`, mapping to `--space-xs` through
  `--space-xl`. The 8px default suits button rows.
- `columnGap` and `rowGap`: the same tokens. Each overrides `gap` on its own axis, so a wrapped
  row can space its lines differently from its items. In a `responsive` stack the stacked
  column uses `rowGap` and the row uses `columnGap`.
- `align`: cross axis, `start`, `center`, `end`, or `stretch`. The default is `center` in a
  row and `stretch` in a column. A `responsive` stack stretches while stacked and centers
  once it is a row.
- `justify`: main axis, `start` (default), `center`, `end`, or `between`.
- `wrap`: `true` by default, because rows that hold actions wrap in Mantine `Group`, Polaris,
  Spectrum `ActionGroup`, and Every Layout Cluster. A row wraps when it runs out of room. Set
  `false` for a toolbar or header that must stay on one line, such as one with a `Spacer`;
  items shrink and then overflow the inline end. It has no effect in a column.
- `label`: gives the stack `role="group"` and an accessible name. Leave it out when a heading
  nearby already names the content. Without `label` the stack has no role. Stack never sets
  `role="toolbar"`, which promises arrow-key navigation that Kestrel does not provide.
- `as`: `div` (default), `ul`, `ol`, or `span`. A `ul` or `ol` drops its list style, padding,
  and margin. Every element keeps `display: flex`. Put a text separator only in a `div` Stack,
  never in a list.
- `className`: merged with the Stack classes.

## Responsive example

```tsx
<Stack direction="responsive" gap="sm" columnGap="md" align="center">
  <Button variant="cta">Random term</Button>
  <Link href="#glossary">browse the glossary</Link>
</Stack>
```

The items stack with an 8px gap on a phone and sit in a row with a 16px gap from 600px up.

## Buttons

Set `justify="end"` to push a button row to the inline end, as in a form, dialog, or drawer
footer, with the committing action last. The default `start` keeps it at the inline start.
Set `justify="center"` for a row that sits centered under a card or a hero, such as a timer's
controls. Pass `label` to name a set of buttons for screen readers.

Use it for a row of icon-only buttons too, such as Edit and Delete beside a list item. The
8px gap also keeps the 44px touch targets of neighboring buttons on a touch screen from
overlapping.
