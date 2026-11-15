import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/base/toast/toast';
import { MAX_SKIPS_PER_MONTH } from '@/domain/settings';
import { useScrollToHash } from '@/hooks/use-scroll-to-hash';
import { createStore, type AppStore } from '@/store/store';
import { AppDataProvider } from '@/store/use-app-data';
import { Settings } from './settings';

const SECTION_IDS = [
  ['Groups', 'settings-groups'],
  ['Days and streak', 'settings-days'],
  ['Alerts', 'settings-alerts'],
  ['Appearance', 'settings-appearance'],
  ['Backup', 'settings-backup'],
];

const stores: AppStore[] = [];
const views: { unmount: () => void }[] = [];
const scrollIntoView = vi.fn();

function setup(): AppStore {
  const store = createStore({ storage: window.localStorage, now: Date.now });
  stores.push(store);
  return store;
}

function Harness() {
  useScrollToHash();
  return <Settings />;
}

function renderSettings(store: AppStore) {
  const view = render(
    <AppDataProvider store={store}>
      <ToastProvider position="top-center">
        <Harness />
      </ToastProvider>
    </AppDataProvider>
  );
  views.push(view);
  return view;
}

beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
});

afterEach(() => {
  views.splice(0).forEach((view) => view.unmount());
  stores.splice(0).forEach((store) => store.destroy());
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  window.history.replaceState(null, '', '/');
  scrollIntoView.mockClear();
  vi.unstubAllGlobals();
});

describe('Settings', () => {
  describe('section list', () => {
    it('should link to each section with a real settings hash URL', () => {
      renderSettings(setup());
      const nav = screen.getByRole('navigation', { name: 'Settings sections' });

      SECTION_IDS.forEach(([label, id]) => {
        expect(within(nav).getByRole('link', { name: label })).toHaveAttribute(
          'href',
          `/settings#${id}`
        );
      });
    });

    it.each(SECTION_IDS)('should focus the %s section when its hash is open', async (label, id) => {
      window.history.replaceState(null, '', `/settings#${id}`);
      renderSettings(setup());

      const target = await screen.findByRole('heading', { level: 2, name: label });
      expect(target).toHaveAttribute('id', id);
      expect(target).toHaveAttribute('tabindex', '-1');
      expect(target).toHaveFocus();
      expect(
        within(screen.getByRole('navigation', { name: 'Settings sections' })).getByRole('link', {
          name: label,
        })
      ).toHaveAttribute('aria-current', 'location');
    });

    it('should mark the first section and update the current link when another is selected', async () => {
      window.history.replaceState(null, '', '/settings');
      renderSettings(setup());
      const nav = screen.getByRole('navigation', { name: 'Settings sections' });
      expect(within(nav).getByRole('link', { name: 'Groups' })).toHaveAttribute(
        'aria-current',
        'location'
      );

      await userEvent.setup().click(within(nav).getByRole('link', { name: 'Alerts' }));
      expect(within(nav).getByRole('link', { name: 'Alerts' })).toHaveAttribute(
        'aria-current',
        'location'
      );
      expect(within(nav).getByRole('link', { name: 'Groups' })).not.toHaveAttribute('aria-current');
    });

    it('should update the current link while scrolling through sections', () => {
      renderSettings(setup());
      SECTION_IDS.forEach(([label], index) => {
        vi.spyOn(
          screen.getByRole('heading', { level: 2, name: label }),
          'getBoundingClientRect'
        ).mockReturnValue({ top: index < 3 ? -100 : 1000 } as DOMRect);
      });

      fireEvent.scroll(window);

      const nav = screen.getByRole('navigation', { name: 'Settings sections' });
      expect(within(nav).getByRole('link', { name: 'Alerts' })).toHaveAttribute(
        'aria-current',
        'location'
      );
    });

    it('should reach a short section before the page bottom activates the last one', () => {
      renderSettings(setup());
      const scrollHeight = vi
        .spyOn(document.documentElement, 'scrollHeight', 'get')
        .mockReturnValue(2000);
      const scrollY = vi
        .spyOn(window, 'scrollY', 'get')
        .mockReturnValue(2000 - window.innerHeight - 100);
      SECTION_IDS.forEach(([label], index) => {
        const tops = [-900, -700, -500, window.innerHeight * 0.6, window.innerHeight * 0.95];
        vi.spyOn(
          screen.getByRole('heading', { level: 2, name: label }),
          'getBoundingClientRect'
        ).mockReturnValue({ top: tops[index] } as DOMRect);
      });

      fireEvent.scroll(window);
      scrollHeight.mockRestore();
      scrollY.mockRestore();

      const nav = screen.getByRole('navigation', { name: 'Settings sections' });
      expect(within(nav).getByRole('link', { name: 'Appearance' })).toHaveAttribute(
        'aria-current',
        'location'
      );
    });

    it('should update the current link when the hash changes through browser history', () => {
      window.history.replaceState(null, '', '/settings#settings-alerts');
      renderSettings(setup());
      const nav = screen.getByRole('navigation', { name: 'Settings sections' });

      window.history.replaceState(null, '', '/settings#settings-backup');
      fireEvent(window, new HashChangeEvent('hashchange'));

      expect(within(nav).getByRole('link', { name: 'Backup' })).toHaveAttribute(
        'aria-current',
        'location'
      );
    });

    it('should not change the current section when opening a link in another tab', () => {
      window.history.replaceState(null, '', '/settings');
      renderSettings(setup());
      const nav = screen.getByRole('navigation', { name: 'Settings sections' });

      window.addEventListener('click', (event) => event.preventDefault(), { once: true });
      fireEvent.click(within(nav).getByRole('link', { name: 'Backup' }), { ctrlKey: true });

      expect(within(nav).getByRole('link', { name: 'Groups' })).toHaveAttribute(
        'aria-current',
        'location'
      );
    });
  });

  describe('days and streak', () => {
    it('should show the stored settings', () => {
      const store = setup();
      store.dispatch({ type: 'updateSettings', patch: { dayStartHour: 3, weekStart: 'sunday' } });
      renderSettings(store);

      expect(screen.getByRole('combobox', { name: 'Day starts at' })).toHaveTextContent('3 AM');
      expect(screen.getByRole('combobox', { name: 'Week starts on' })).toHaveTextContent('Sunday');
    });

    it('should update the week start in the store', async () => {
      const store = setup();
      renderSettings(store);
      const user = userEvent.setup();

      await user.click(screen.getByRole('combobox', { name: 'Week starts on' }));
      await user.click(screen.getByRole('option', { name: 'Sunday' }));

      expect(store.getState().data.settings.weekStart).toBe('sunday');
    });

    it('should update the day start hour in the store', async () => {
      const store = setup();
      renderSettings(store);
      const user = userEvent.setup();

      await user.click(screen.getByRole('combobox', { name: 'Day starts at' }));
      await user.click(screen.getByRole('option', { name: '4 AM' }));

      expect(store.getState().data.settings.dayStartHour).toBe(4);
    });

    it('should update skips per month in the store and ignore an empty value', async () => {
      const store = setup();
      renderSettings(store);
      const user = userEvent.setup();
      const input = screen.getByRole('spinbutton', { name: 'Skips per month' });

      await user.clear(input);
      expect(store.getState().data.settings.skipsPerMonth).toBe(2);

      await user.type(input, '5');
      expect(store.getState().data.settings.skipsPerMonth).toBe(5);
    });

    it('should show the allowed range as helper text', () => {
      renderSettings(setup());

      const input = screen.getByRole('spinbutton', { name: 'Skips per month' });
      expect(input).toHaveAccessibleDescription(`0 to ${MAX_SKIPS_PER_MONTH}`);
      expect(input).not.toBeInvalid();
    });

    it('should show an error and keep the saved value when skips per month is out of range', async () => {
      const store = setup();
      renderSettings(store);
      const user = userEvent.setup();
      const input = screen.getByRole('spinbutton', { name: 'Skips per month' });

      await user.clear(input);
      await user.type(input, '50');

      expect(input).toBeInvalid();
      expect(input).toHaveAccessibleDescription(`Use a whole number, 0 to ${MAX_SKIPS_PER_MONTH}`);
      expect(store.getState().data.settings.skipsPerMonth).not.toBe(50);

      await user.clear(input);
      await user.type(input, '7');
      expect(input).not.toBeInvalid();
      expect(store.getState().data.settings.skipsPerMonth).toBe(7);
    });
  });

  describe('appearance', () => {
    it('should offer the three theme choices', () => {
      renderSettings(setup());

      expect(screen.getByRole('radio', { name: 'Match this device' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Light' })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: 'Dark' })).not.toBeChecked();
    });

    it('should persist the chosen theme across a reload', async () => {
      const user = userEvent.setup();
      const view = renderSettings(setup());

      await user.click(screen.getByRole('radio', { name: 'Light' }));
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      view.unmount();

      renderSettings(setup());
      expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    });

    it('should persist Match this device across a reload', async () => {
      const user = userEvent.setup();
      window.localStorage.setItem('daily-focus:theme', 'dark');
      const view = renderSettings(setup());
      expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();

      await user.click(screen.getByRole('radio', { name: 'Match this device' }));
      view.unmount();

      renderSettings(setup());
      expect(screen.getByRole('radio', { name: 'Match this device' })).toBeChecked();
      expect(window.localStorage.getItem('daily-focus:theme')).toBeNull();
    });
  });
});
