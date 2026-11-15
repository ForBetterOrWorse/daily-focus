# AI Agent Instructions

**Brand:** neutral
**Expressive mode:** on
**Expressive variant:** flat
**FBOW:** yes. Load the fbow-brand skill before placing the logo.

Baseline engineering practices for agents working in this project. A more specific
instruction file, if one exists, overrides these.

## Stack And Workflow

- React + TypeScript + Vite. Use `pnpm` for local commands.
- Prefer small, behavior-focused changes over broad rewrites.

## Codebase Structure

- `src/components/base/` — shared UI primitives with no domain knowledge (Button,
  Modal, Switch, Icon, etc.). Reusable across any feature or view. Each component
  has its own subdirectory.
- `src/components/features/` — domain-specific components. Flat directory (no
  subdirectories). A component goes here if it knows about the application's domain
  and could not be reused unchanged in a different app.
- `src/hooks/` — React hooks.
- `src/styles/` — global CSS.
- See [`docs/architecture.md`](docs/architecture.md) for the architecture and data flow.

## Daily Focus Rules

- Domain functions take `now` as an argument and never read the clock themselves.
- Components do not access `localStorage`; persistence belongs in the store.
- Keep Daily Focus styling out of `src/components/base/`.
- Global shortcuts must use `useShortcut`; components must not add their own `keydown` listener for a global shortcut. `useShortcut` owns the not-while-typing rule.

## Code Style

- Use named exports for components, hooks, and utilities. Do not use default exports.
- File names use kebab-case. Name a file after the thing it exports: `button.tsx`
  exports `Button`, not `index.tsx`. `index.{ts,tsx}` is reserved for barrel files
  that only re-export from siblings; any file with real logic must not be named `index`.
- Colocate related files: `button.module.css`, `button.test.tsx`.
  Never `index.module.css` or `index.test.tsx`.
- Delete dead code your change leaves behind: no unused imports, unreferenced exports, or
  commented-out blocks.
- Add a comment only when the code is not self-explanatory. Clear naming and structure come first.

## Testing

- Implementation changes must include tests, except CSS changes.
- Vitest with React Testing Library.
- A test file mirrors the unit under test: `button.test.tsx` for `button.tsx`. Never
  `index.test.tsx`.
- Test user-observable behavior and accessibility, not implementation details. Prefer
  `getByRole` / `findByRole` with accessible names, and `userEvent` for interaction flows.

## Writing in Docs and Comments

- Use American English spelling and grammar.

## UI Design

- Do not use emojis or ASCII symbols in UI. Use the icon components in
  `src/components/base/icon/`. Import from `@/components/base/icon`. If you need an
  icon not in this set, ask the user to provide one.
- Icons in `src/components/base/icon/` should have `aria-hidden="true"`.

## Styling

- Use CSS modules (`.module.css`). Never use inline styles or `!important`.
- Keep colors accessible with sufficient contrast.
- Use logical properties, not physical ones, so styles work in RTL locales: `padding-inline`,
  `margin-block`, `border-inline-start`, `inset-inline-start`, `text-align: start | end`,
  `float: inline-start`. Physical values stay correct only for `transform`, `box-shadow`
  offsets, and viewport-tied geometry.
- Use mobile-first `min-width` media queries. The only allowed breakpoints are `600px`,
  `768px`, `1024px`, `1440px`, and `2560px`. The 320px baseline needs no query. Do not
  introduce other breakpoint values.
- Use rem for anything that should grow with the user's browser font size: font sizes,
  spacing, control heights, icon sizes, and layout widths. Use px for border and outline
  widths (including focus rings), border radius, and breakpoints.
- Only `base.css` may set `font-size` on `html`. Components and pages never change the root size.
- For visually-hidden elements, use the global `.sr-only` class. Never redeclare the pattern in a module file. If a module selector must reference the class, use `composes: sr-only from global`.

## Accessibility

- Use semantic HTML first, then add ARIA only where semantics are not enough.
- Every meaningful image needs alt text; decorative images use an empty alt attribute.
- Custom interactive regions must be focusable, keyboard-operable, and expose an accessible name.
- Disabled controls use `aria-disabled="true"`, never the native `disabled` attribute or the `.disabled` property. The control stays focusable and ignores click, Enter, Space, and input. Style it with `[aria-disabled='true']`, never `:disabled`.

## Validation

- Run the narrowest relevant test file first. Before finishing larger changes, run
  `pnpm test` and `pnpm build` when the touched area justifies it.
