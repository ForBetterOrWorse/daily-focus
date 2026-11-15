---
summary: 'Use Modal for a focused task that needs the reader to stay on the current page.'
---

Use a modal for a short task or decision that must happen before the reader
returns to the page. Keep `open` controlled by the parent and set it to `false`
in `onClose`. The dialog closes from its close button, backdrop, or Escape and
keeps keyboard focus inside while open.

```tsx
<Modal
  open={open}
  onClose={() => setOpen(false)}
  closeLabel="close account dialog"
  ariaLabelledBy="account-dialog-title"
>
  <Modal.Header id="account-dialog-title">Account</Modal.Header>
  <Modal.Body>{/* dialog content */}</Modal.Body>
</Modal>
```

The modal stays on screen for a short exit animation after `open` becomes
`false`, then unmounts. With `keepMounted` it hides instead of unmounting.

Make `ariaLabelledBy` match the `id` on `Modal.Header`. Pass `triggerElement`
when focus should return to a known opener, or `initialFocus` when the first
focusable control is not the right starting point.
