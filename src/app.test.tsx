import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { createStore } from './store/store';
import { AppDataProvider } from './store/use-app-data';

const stores: ReturnType<typeof createStore>[] = [];
const unmounts: (() => void)[] = [];

function renderApp() {
  const store = createStore({ storage: window.localStorage, now: Date.now });
  stores.push(store);
  const view = render(
    <AppDataProvider store={store}>
      <App />
    </AppDataProvider>
  );
  unmounts.push(view.unmount);
  return view;
}

const routes = [
  { path: '/', heading: 'Today' },
  { path: '/stats', heading: 'Stats' },
  { path: '/settings', heading: 'Settings' },
];

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount());
  stores.splice(0).forEach((store) => store.destroy());
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  window.history.replaceState({}, '', '/');
});

describe('App', () => {
  it.each(routes)(
    'should render the $heading route with its current navigation link',
    async ({ path, heading }) => {
      window.history.replaceState({}, '', path);
      renderApp();

      expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: heading })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Daily Focus' })).toHaveAttribute('href', '/');
      for (const route of routes) {
        expect(screen.getByRole('link', { name: route.heading })).toHaveAttribute(
          'href',
          route.path
        );
      }
      expect(screen.queryByRole('button', { name: 'settings' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'keyboard shortcuts' })).not.toBeInTheDocument();
      await waitFor(() => expect(document.title).toBe(`${heading} | Daily Focus`));
    }
  );

  it('should apply the system theme on the home page', () => {
    renderApp();

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('should navigate between pages and home without reloading the document', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('link', { name: 'Stats' }));
    expect(screen.getByRole('heading', { name: 'Stats', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Stats' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    expect(screen.getByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Daily Focus' }));
    expect(screen.getByRole('heading', { name: 'Today', level: 1 })).toBeInTheDocument();
  });

  it('should apply the saved theme on the home page', () => {
    window.localStorage.setItem('daily-focus:theme', 'light');

    renderApp();

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('should move focus to main content from the skip link', async () => {
    const user = userEvent.setup();
    renderApp();

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    await user.tab();
    expect(skipLink).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it.each(['/', '/stats'])('should not show the FBOW footer credit on %s', (path) => {
    window.history.replaceState({}, '', path);
    renderApp();

    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('should show the FBOW footer credit on Settings', () => {
    window.history.replaceState({}, '', '/settings');
    renderApp();

    expect(screen.getByRole('contentinfo')).toHaveTextContent('Made by the ForBetterOrWorse team.');
  });

  describe('keyboard shortcuts dialog', () => {
    it('should open on Shift+/ and list all four shortcuts', async () => {
      const user = userEvent.setup();
      renderApp();

      await user.keyboard('{Shift>}/{/Shift}');

      const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
      const rows = within(dialog)
        .getAllByRole('term')
        .map((term) => [term.textContent, term.nextElementSibling?.textContent]);
      expect(rows).toEqual([
        ['Shift+/', 'Show keyboard shortcuts'],
        ['Shift+S', 'Start or pause the timer'],
        ['Shift+E', 'Add a task'],
        ['\\', 'Show or hide Habits and Tasks (wide screens)'],
      ]);
    });
  });
});
