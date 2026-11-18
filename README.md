# Daily Focus

A client-only timer and habit tracking app.

## Data and backups

Your preferences, focus sessions, habits, and tasks are stored in your browser's local storage. You can export or import a backup anytime.

## How to run

```sh
pnpm install
pnpm dev
```

- `pnpm test` runs the tests.
- `pnpm build` creates a production build in `dist/`.
- `pnpm preview` serves the production build, including the service worker.

## Tech stack

- React 19
- TypeScript
- Wouter
- Vite with vite-plugin-pwa
- Vitest and React Testing Library
- ESLint, Stylelint, and Prettier

## License

Licensed under AGPL-3.0-or-later. See [LICENSE](LICENSE).
