---
summary: 'Use Drawer for modal content that enters from a screen edge.'
---

Use a drawer for a focused task or supporting content that needs more room than
a popover but should keep the current page in context. Keep `open` in the
parent and set it to `false` in `onClose`; the drawer also closes from its close
button, backdrop, or Escape.

```tsx
<Drawer open={open} onClose={() => setOpen(false)} title="Filters">
  <Drawer.Body>{/* filter controls */}</Drawer.Body>
  <Drawer.Footer>{/* actions */}</Drawer.Footer>
</Drawer>
```

Set `slideFrom` to `start`, `end`, or `bottom` to choose the entry edge. Provide
a concise `title`, and use `initialFocus` when a specific control should receive
focus on open. On close the panel slides out and the backdrop fades with it, and the
drawer unmounts when the panel's exit animation ends. Under reduced motion both
cross-fade instead. Use `Modal` when a centered dialog fits the task better.
