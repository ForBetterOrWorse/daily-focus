---
summary: 'Use a toast to confirm that an action finished, without interrupting the reader.'
---

Wrap the app once in `ToastProvider`, which keeps a log region in the
page. Then call `useToast()` anywhere below it and pass a short message.

```tsx
const showToast = useToast();

showToast({ message: 'Draft saved', tone: 'success' });
showToast({ message: 'Upload failed. Check your connection and try again.', tone: 'danger' });
```

`tone` fills the toast with its status color: `success`, `danger`, `info`, or
`warning`. A `neutral` toast, the default, takes a raised surface of the theme
(`--color-bg-quaternary`) with the normal text color. Light text
sits on the fill in the light theme and dark text in the dark theme, and the
dismiss and action buttons take the same ink. Each toned toast draws its icon
(check, X, info, or warning triangle). Pass `icon: false` to drop it. The color
and icon are the only tone cues, so with the icon off the message must name the
outcome ("Upload failed", not "Something went wrong").

Add one text `action`, such as Undo, to offer the way back from an action that
just happened. The action is a borderless pill in the inverted color: the ink
fills it and its label takes the toast's own color (the status color on a toned
toast), so it reads as a control beside the message. Running it also dismisses
the toast.

```tsx
showToast({ message: 'Walk deleted', action: { label: 'Undo', onAction: restore } });
```

A toast with an action keeps the message and the action on one line when they
fit, with the action at the end. When they do not, the toast stacks as Material's
two-line snackbar does: the message keeps the start edge, the action takes its own
row at the end edge, and the dismiss button stays in the top end corner. Keep
the label to a word or two. Every toast has the dismiss button, built from
`Button`, so the reader can always clear it.

A dismissed toast fades out and its space collapses, so the toasts around it slide
into place instead of jumping. It unmounts when that animation ends and takes no
clicks or focus while it leaves. With reduced motion it cross-fades and the space
snaps.

`showToast` returns a function that dismisses the toast early, for a toast the
situation has made stale.

Toasts sit at the bottom end of the page. Pass `position` to `ToastProvider` to place
them at `top-start`, `top-center`, `top-end`, `bottom-start`, `bottom-center`, or
`bottom-end`. Start and end follow the reading direction.

A drawer or other modal panel makes the page behind it inert, so a page toast
cannot be reached or announced while it is open. Wrap the panel's content in a
`ToastProvider` with `scope="container"` and give the content's wrapper
`position: relative`; toasts then sit inside the panel, and `useToast` inside it
shows them there.

A toast takes one of two forms, chosen by whether the reader must act on it.

- **A short toast** (the default) is informational. It takes no focus, since that
  would interrupt someone typing. `ToastProvider` keeps a log region mounted
  outside the list, and each short toast's message is announced through it as it
  arrives.
- **A toast that needs the reader** is one that stays (`danger` and `warning`) or
  carries an `action`. It renders as a non-modal `role="alertdialog"`, named by its
  tone ("Error", "Warning") and described by the message, outside any live region
  so it is read once. It takes focus when it appears: on the action first, on the
  dismiss button otherwise. Dismissing, running the action, or pressing Escape
  returns focus to the control the reader was on. Focus pauses the timer, so an Undo
  stays until the reader moves away. Focus does not stay trapped, since the page
  behind remains usable.

Toasts hide after five seconds and pause while the pointer or focus is on them.
A `danger` or `warning` toast stays until the reader dismisses it, since an
error or caution the reader missed is worse than one extra click. Keep the message under one line and
place anything the reader must act on in the page or a dialog, since a toast
disappears. Use Banner for a notice that should stay with the page.
