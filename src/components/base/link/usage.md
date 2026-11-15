---
summary: 'Use Link for navigation and underlined links in running text.'
---

`Link` renders a native anchor and requires an `href`. Its text uses the primary
foreground with an underline, then changes to the accent text color and loses
the underline on hover. Do not use a plain, un-underlined anchor in body text.
The Navbar title is a custom anchor with its own hover treatment.

```tsx
<p>
  Read the <Link href="/guides">guide</Link>.
</p>
```
