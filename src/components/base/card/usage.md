---
summary: 'Use Card to group the content about one thing, such as a lesson, a project, or a result.'
---

Card is a bordered box on the brightest surface. Pick the element with `as`:
`article` for a self-contained item, `li` inside a list of cards, `section`
for a titled region, and `div` otherwise.

```tsx
<Card as="article">
  <h2>
    <CardLink href="/lessons/flexbox">Flexbox basics</CardLink>
  </h2>
  <p>Lay out a row of items.</p>
</Card>
```

To make the whole card clickable, put one `CardLink` inside it, usually in the
heading. The link stretches over the card, the card draws the focus ring, and
in Tactile it lifts on hover. Keep other interactive elements out of a
clickable card, since the link covers them. Group cards with gaps.

For a titled card, pass `title`. Card renders it as a heading in the first row,
with an optional `description` under it and an optional `action` at the end of
the title row. The title and description are one block that owns the space
between them, and the card's gap sets the space below it, so a card with no
description keeps the same space under its title. Use `headingLevel` (2 to 4)
to fit the page outline, and `headingProps` for an `id` or `tabIndex` on the
heading.

```tsx
<Card as="section" title="Backup" description="Your data lives only in this browser.">
  <Button>Export backup</Button>
</Card>
```
