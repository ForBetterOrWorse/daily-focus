---
summary: 'Use Navbar for the project header, app navigation, and utility actions.'
---

Use Navbar once at the top of the application. By default, it provides the
project home link and utility actions. Set `appName` and `navItems` for an app
title and its primary page links. Set `current` on the active item; the parent
owns page destinations and utility dialogs.

For client-side routing, pass the router's link component as `linkComponent`.
It renders the home link and all navigation items. Without it, Navbar uses
ordinary anchors.

In Expressive and Tactile, the current page marker stays orange as decoration;
chosen controls use green.

```tsx
<Navbar
  appName="Daily Focus"
  navItems={[
    { href: '#today', label: 'Today', current: true },
    { href: '#stats', label: 'Stats' },
    { href: '#settings', label: 'Settings' },
  ]}
  onOpenSettings={() => setSettingsOpen(true)}
  onOpenShortcuts={() => setShortcutsOpen(true)}
/>
```

The utility actions render only when their handlers are supplied. Without
`appName`, the scaffold fills the project name and brand mark when it copies
this component. Use `leadingActions` for a page-specific action before the
keyboard shortcuts and settings buttons.
