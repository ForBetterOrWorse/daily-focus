import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/base/toast/toast';
import { LiveAnnouncerProvider } from '@/components/features/live-announcer';
import { dayKeyOf, weekdayOf } from '@/domain/days';
import { createStore, type AppStore } from '@/store/store';
import { AppDataProvider } from '@/store/use-app-data';
import { Today } from './today';

const stores: AppStore[] = [];

function setup() {
  const store = createStore({ storage: window.localStorage, now: Date.now });
  stores.push(store);
  return store;
}

function renderToday(store: AppStore) {
  return render(
    <AppDataProvider store={store}>
      <ToastProvider>
        <LiveAnnouncerProvider>
          <Today />
        </LiveAnnouncerProvider>
      </ToastProvider>
    </AppDataProvider>
  );
}

function mockViewport(wide: boolean) {
  const original = window.matchMedia;
  window.matchMedia = (query: string) =>
    ({
      matches: wide && query === '(min-width: 1024px)',
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
  return () => {
    window.matchMedia = original;
  };
}

let restoreViewport = mockViewport(false);

beforeEach(() => {
  restoreViewport = mockViewport(false);
});

afterEach(() => {
  restoreViewport();
  stores.splice(0).forEach((store) => store.destroy());
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('Today', () => {
  it('should show the common presets when both sections are empty', () => {
    renderToday(setup());
    expect(
      within(screen.getByRole('list', { name: 'Common habits' })).getAllByRole('listitem')
    ).toHaveLength(6);
    expect(
      within(screen.getByRole('list', { name: 'Common tasks' })).getAllByRole('listitem')
    ).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Edit habits' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New habit' })).toBeVisible();
  });

  it('should add Read and hide the habit preset row', async () => {
    const user = userEvent.setup();
    renderToday(setup());
    await user.click(screen.getByRole('button', { name: 'Read 30 min' }));
    await user.click(
      within(screen.getByRole('region', { name: 'Habits' })).getByRole('button', { name: 'Done' })
    );
    expect(screen.getByRole('button', { name: 'Read, 0 of 30 min. Start timer' })).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Common habits' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit habits' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Habits' })).toHaveFocus();
  });

  it('should add a check task from the plus and return focus to it', async () => {
    const user = userEvent.setup();
    const store = setup();
    renderToday(store);

    await user.click(screen.getByRole('button', { name: 'New task' }));
    const name = screen.getByRole('textbox', { name: 'Name' });
    expect(name).toHaveFocus();
    await user.type(name, 'Write report{Enter}');

    expect(screen.getByRole('button', { name: 'Write report. Check off' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'New task' })).toHaveFocus();
  });

  it('should trap keyboard focus inside the section drawer', async () => {
    const user = userEvent.setup();
    renderToday(setup());

    await user.click(screen.getByRole('button', { name: 'New habit' }));
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Add habit' })).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('should not open the new-task form with Shift+E', async () => {
    const user = userEvent.setup();
    renderToday(setup());

    await user.keyboard('{Shift>}e{/Shift}');

    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should not show quick sessions in either section', () => {
    const store = setup();
    store.dispatch({ type: 'newQuickSession', start: false, name: 'Quick work' });
    renderToday(store);
    expect(screen.queryByText('Quick work')).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Common tasks' })).toBeVisible();
  });

  it('should say when habits exist but none are scheduled today', () => {
    const store = setup();
    const data = store.getState().data;
    const day = dayKeyOf(Date.now(), data.settings.dayStartHour);
    store.dispatch({
      type: 'addItem',
      item: {
        kind: 'habit',
        name: 'Walk',
        completion: 'check',
        days: [(weekdayOf(day) + 1) % 7],
      },
    });
    renderToday(store);
    expect(screen.getByText('No habits today.')).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Common habits' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit habits' })).toBeVisible();
  });

  it('should show tasks as standalone items and place done tasks last', async () => {
    const user = userEvent.setup();
    const store = setup();
    for (const name of ['First', 'Finished', 'Open']) {
      store.dispatch({
        type: 'addItem',
        item: { kind: 'task', name, completion: 'check' },
      });
    }
    renderToday(store);
    await user.click(screen.getByRole('button', { name: 'Finished. Check off' }));
    const tasks = screen.getByRole('region', { name: 'Tasks' });
    const list = within(tasks).getByRole('list', { name: 'Tasks' });
    expect(
      within(list)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['First', 'Open', 'Finished']);
  });

  it('should show the sections and a jump button, and no columns toggle, below 1024px', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    renderToday(setup());

    expect(screen.getByRole('heading', { name: 'Habits' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Add habits and tasks' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { expanded: true })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Habits and tasks' }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(screen.getByRole('heading', { name: 'Habits' })).toHaveFocus();
  });

  describe('auto-stop notice', () => {
    function setupStopped(name: string, kind: 'named' | 'quick') {
      const store = setup();
      if (kind === 'named') {
        store.dispatch({
          type: 'addItem',
          item: { kind: 'task', name, completion: 'check' },
        });
      } else {
        store.dispatch({ type: 'newQuickSession', start: false });
      }
      const data = store.getState().data;
      const itemId = data.items[0].id;
      store.dispatch({
        type: 'restore',
        snapshot: { ...data, meta: { ...data.meta, autoStop: { itemId, at: Date.now() } } },
      });
      return store;
    }

    it('should show the banner and remove it for good when dismissed', async () => {
      const user = userEvent.setup();
      const store = setupStopped('Read', 'named');
      renderToday(store);

      expect(
        screen.getByText('Read ran for 12 hours, so it stopped and saved 12 h.')
      ).toBeVisible();
      await user.click(screen.getByRole('button', { name: 'Dismiss' }));
      fireEvent.transitionEnd(screen.getByRole('complementary', { name: 'Notice' }), {
        propertyName: 'opacity',
      });

      expect(screen.queryByText(/ran for 12 hours/)).not.toBeInTheDocument();
      expect(store.getState().data.meta.autoStop).toBeNull();
    });

    it('should show no banner without an auto-stop', () => {
      renderToday(setup());
      expect(screen.queryByText(/ran for 12 hours/)).not.toBeInTheDocument();
    });
  });

  describe('from 1024px', () => {
    beforeEach(() => {
      restoreViewport();
      restoreViewport = mockViewport(true);
    });

    it('should show the card and the invite on the first visit', () => {
      renderToday(setup());
      expect(screen.getByRole('button', { name: 'Add habits and tasks' })).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Habits and tasks' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Habits' })).not.toBeInTheDocument();
    });

    it('should open the columns and focus the toggle when the invite is pressed', async () => {
      const user = userEvent.setup();
      const store = setup();
      renderToday(store);

      await user.click(screen.getByRole('button', { name: 'Add habits and tasks' }));

      expect(store.getState().data.meta.columnsOpen).toBe(true);
      expect(screen.getByRole('button', { name: 'Habits and tasks' })).toHaveFocus();
      expect(screen.getByRole('heading', { name: 'Habits' })).toBeVisible();
      expect(
        screen.queryByRole('button', { name: 'Add habits and tasks' })
      ).not.toBeInTheDocument();
    });

    it('should open the columns with the shortcut on the first visit', async () => {
      const user = userEvent.setup();
      const store = setup();
      renderToday(store);

      await user.keyboard('\\');

      expect(screen.getByRole('heading', { name: 'Habits' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Habits and tasks' })).toHaveFocus();
    });

    it('should not open the columns with Shift+E', async () => {
      const user = userEvent.setup();
      const store = setup();
      store.dispatch({ type: 'setColumnsOpen', open: false });
      renderToday(store);

      await user.keyboard('{Shift>}e{/Shift}');

      expect(store.getState().data.meta.columnsOpen).toBe(false);
      expect(screen.queryByRole('heading', { name: 'Tasks' })).not.toBeInTheDocument();
    });

    it('should flip the toggle on each press and keep focus on it', async () => {
      const user = userEvent.setup();
      const store = setup();
      store.dispatch({ type: 'setColumnsOpen', open: true });
      renderToday(store);
      const toggle = screen.getByRole('button', { name: 'Habits and tasks' });

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle).toHaveFocus();
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('should toggle the columns with the backslash key outside fields', async () => {
      const user = userEvent.setup();
      const store = setup();
      store.dispatch({ type: 'setColumnsOpen', open: true });
      renderToday(store);

      await user.keyboard('\\');
      expect(store.getState().data.meta.columnsOpen).toBe(false);
      await user.keyboard('\\');
      expect(store.getState().data.meta.columnsOpen).toBe(true);
    });

    it('should keep the choice after remounting from the store', async () => {
      const user = userEvent.setup();
      const store = setup();
      store.dispatch({ type: 'setColumnsOpen', open: true });
      const view = renderToday(store);
      await user.click(screen.getByRole('button', { name: 'Habits and tasks' }));
      view.unmount();

      renderToday(store);

      expect(screen.getByRole('button', { name: 'Habits and tasks' })).toHaveAttribute(
        'aria-expanded',
        'false'
      );
      expect(screen.queryByRole('heading', { name: 'Habits' })).not.toBeInTheDocument();
    });
  });
});
