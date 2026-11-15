---
summary: Use Container as the page-width wrapper that centers content, caps its width, and sets the inline gutter.
---

`Container` is the page-width wrapper. It centers itself, caps its width with `size`, and owns
the inline gutter. It adds no block padding; the page sets its own vertical spacing. It renders a
`div` by default. Use `as` for another element, such as `main`, `header`, or `section`.

```tsx
<Container as="main" size="md">
  <h1>Settings</h1>
</Container>
```

## Props

- `size`: `sm`, `md`, `lg`, `xl`, or `full` (default). `full` has no maximum width.

| Size   | Token            | Width |
| ------ | ---------------- | ----- |
| `sm`   | `--container-sm` | 42rem |
| `md`   | `--container-md` | 48rem |
| `lg`   | `--container-lg` | 64rem |
| `xl`   | `--container-xl` | 72rem |
| `full` | none             | none  |

The sizes follow the Tailwind v4 and Chakra container scale (`2xl` 42rem, `3xl` 48rem, `5xl`
64rem, `6xl` 72rem), renamed to `sm` through `xl`.

- `as`: the element to render. Defaults to `div`.
- `className`: merged with the Container classes.
- Every other prop passes through to the element.

## Gutter

`padding-inline` is `--container-gutter`: `--space-md` (16px), and `--space-lg` (24px) from the
600px breakpoint. Container sets the property on its own element, so children read the same value.
Do not add inline padding to the page wrapper. Container owns the gutter only, as Mantine and
Radix containers do, so a page and its sections choose their own block spacing.

## Switching size at a breakpoint

Each size class sets `--container-size`. A page whose width changes at a breakpoint sets
`--container-max` in its own class, with tokens only. `--container-max` wins over the size class
whatever order the stylesheets load in, and it does not inherit, so a nested Container keeps its
own size:

```css
@media (min-width: 1024px) {
  .main {
    --container-max: var(--container-xl);
  }
}
```

## Immersive sections

Use `Bleed` for a section that reaches the Container's edges. Do not nest a Container for it.
