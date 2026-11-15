---
summary: 'Use Banner for a brief notice that sits alongside page content.'
---

Use a banner for a page-level notice that should stay visible without blocking
the task in progress. Keep its message short and relevant to the surrounding
content. Use a dialog for information that requires the reader to respond
before continuing.

```tsx
<Banner onDismiss={() => setVisible(false)}>Your changes are saved.</Banner>
```

The dismiss button appears by default, so provide `onDismiss` to remove or hide
the notice. `onDismiss` fires after the banner finishes fading out and collapsing, so
the owner unmounts it then. Set `dismissible={false}` when the notice must remain visible.

A banner that is part of the page from the first paint needs no announcement; a
screen reader finds it in place. A banner that appears later, such as one a timer
or an action raises, is silent by default. Set `announce` on it so a screen reader
reads the message when it arrives. The message sits in a status region that mounts
empty and fills on the next effect, because a live region only announces content
added after it exists. Banner takes no focus, since it carries no action beyond
dismissing it.
