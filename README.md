# Daily Focus

Daily Focus is a client-only app with a focus timer, habits, tasks, and a Stats page. All data lives in this browser's localStorage. There is no account and no server.

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
