---
summary: 'Show a keyboard skip link on focus and move focus to the main content.'
---

Place `SkipLink` first in the page's focus order. Give its target an `id` and
`tabIndex={-1}` so activating the link moves keyboard focus there.

```tsx
<SkipLink targetId="main-content">Skip to main content</SkipLink>
<main id="main-content" tabIndex={-1}>
  ...
</main>
```
