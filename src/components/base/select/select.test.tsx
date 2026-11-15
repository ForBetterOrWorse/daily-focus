import { createRef } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MoonIcon, SunIcon } from '@/components/base/icon';
import { Field } from '@/components/base/field/field';
import { Select, type SelectOption, type SelectOptionGroup } from './select';

const languages: SelectOption[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'sw', label: 'Swahili', disabled: true },
  { value: 'sv', label: 'Swedish' },
  { value: 'vi', label: 'Vietnamese' },
];

const themes: SelectOption[] = [
  { value: 'light', label: 'Light', icon: <SunIcon /> },
  { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
];

function renderSelect(props: Partial<Parameters<typeof Select>[0]> = {}) {
  const user = userEvent.setup();
  const onValueChange = vi.fn();
  render(
    <>
      <Field label="Language" hint="The course is taught in it.">
        <Select
          options={languages}
          placeholder="Choose a language"
          onValueChange={onValueChange}
          {...props}
        />
      </Field>
      <button type="button">Next</button>
    </>
  );
  return { user, onValueChange, trigger: screen.getByRole('combobox', { name: 'Language' }) };
}

describe('Select', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should take its name and hint from a Field and show the placeholder', () => {
    const { trigger } = renderSelect();

    expect(trigger).toHaveAccessibleDescription('The course is taught in it.');
    expect(trigger).toHaveTextContent('Choose a language');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('should open on click and choose an option with the mouse', async () => {
    const { user, trigger, onValueChange } = renderSelect();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox', { name: 'Language' })).toBeVisible();

    await user.click(screen.getByRole('option', { name: 'Spanish' }));

    expect(onValueChange).toHaveBeenCalledWith('es');
    expect(trigger).toHaveTextContent('Spanish');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should mark the chosen option as selected', async () => {
    const { user, trigger } = renderSelect({ defaultValue: 'vi' });

    await user.click(trigger);

    expect(screen.getByRole('option', { name: 'Vietnamese' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('option', { name: 'Vietnamese' })).toHaveFocus();
  });

  it('should move with the arrow keys, skip disabled options, and choose with Enter', async () => {
    const { user, trigger, onValueChange } = renderSelect();

    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'English' })).toHaveFocus();

    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Swedish' })).toHaveFocus();

    await user.keyboard('{End}{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Vietnamese' })).toHaveFocus();

    await user.keyboard('{Home}{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('en');
    expect(trigger).toHaveFocus();
  });

  it('should choose with Space', async () => {
    const { user, trigger, onValueChange } = renderSelect();

    trigger.focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('option', { name: 'Vietnamese' })).toHaveFocus();

    await user.keyboard(' ');
    expect(onValueChange).toHaveBeenCalledWith('vi');
  });

  it('should open on a letter and highlight the first match without choosing it', async () => {
    const { user, trigger, onValueChange } = renderSelect();

    trigger.focus();
    await user.keyboard('s');

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'Spanish' })).toHaveFocus();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('should close on Escape without changing the value', async () => {
    const { user, trigger, onValueChange } = renderSelect({ defaultValue: 'en' });

    await user.click(trigger);
    await user.keyboard('{ArrowDown}{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveTextContent('English');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('should close on Tab without changing the value and move focus on', async () => {
    const { user, trigger, onValueChange } = renderSelect({ defaultValue: 'en' });

    await user.click(trigger);
    await user.keyboard('{ArrowDown}');
    await user.tab();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('should close on a second trigger click without the press blurring the list first', async () => {
    const { user, trigger } = renderSelect();

    await user.click(trigger);
    const option = screen.getByRole('option', { name: 'English' });

    // Safari and macOS Firefox do not focus a pressed button, so an unprevented press would blur
    // the list to the body, close it, and let the click reopen it.
    expect(fireEvent.mouseDown(trigger)).toBe(false);
    expect(option).toHaveFocus();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('should close when the reader clicks outside', async () => {
    const { user, trigger } = renderSelect();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('should not choose a disabled option', async () => {
    const { user, trigger, onValueChange } = renderSelect();

    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'Swahili' }));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('should follow a controlled value', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Select aria-label="Language" options={languages} value="en" onValueChange={() => {}} />
    );
    const trigger = screen.getByRole('combobox', { name: 'Language' });

    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'Spanish' }));
    expect(trigger).toHaveTextContent('English');

    rerender(
      <Select aria-label="Language" options={languages} value="es" onValueChange={() => {}} />
    );
    expect(trigger).toHaveTextContent('Spanish');
  });

  it('should show group headings and option descriptions', async () => {
    const user = userEvent.setup();
    const groups: SelectOptionGroup[] = [
      { label: 'Americas', options: [{ value: 'es', label: 'Spanish', description: '3 mentors' }] },
      { label: 'Asia', options: [{ value: 'vi', label: 'Vietnamese' }] },
    ];
    render(<Select aria-label="Language" options={groups} />);

    await user.click(screen.getByRole('combobox', { name: 'Language' }));

    const americas = screen.getByRole('group', { name: 'Americas' });
    expect(within(americas).getByRole('option', { name: 'Spanish' })).toHaveAccessibleDescription(
      '3 mentors'
    );
    expect(screen.getByRole('group', { name: 'Asia' })).toBeInTheDocument();
  });

  it('should submit and reset its value through a form', async () => {
    const user = userEvent.setup();
    render(
      <form aria-label="Course">
        <Select aria-label="Language" name="language" options={languages} defaultValue="en" />
        <button type="reset">Reset</button>
      </form>
    );
    const form = screen.getByRole('form', { name: 'Course' }) as HTMLFormElement;
    const trigger = screen.getByRole('combobox', { name: 'Language' });

    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'Spanish' }));
    expect(new FormData(form).get('language')).toBe('es');

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(trigger).toHaveTextContent('English');
  });

  it('should not open when disabled', async () => {
    const { user, trigger } = renderSelect({ disabled: true });

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('should stay focusable and report disabled while blocking the keyboard', async () => {
    const { user, trigger } = renderSelect({ disabled: true });

    await user.tab();
    await user.keyboard('{ArrowDown}');

    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    expect(trigger).not.toBeDisabled();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('should open in a sheet named after the label on a phone', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query === '(pointer: coarse)',
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList
    );
    // jsdom has no modal dialog support.
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: showModal,
    });
    const { user, trigger } = renderSelect();

    await user.click(trigger);

    expect(showModal).toHaveBeenCalled();
    const sheet = screen.getByRole('dialog', { name: 'Language' });
    expect(within(sheet).getByRole('listbox', { name: 'Language' })).toBeInTheDocument();
    expect(within(sheet).getByRole('option', { name: 'English' })).toHaveFocus();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  });

  describe('on a phone', () => {
    function mockSheet() {
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) =>
          ({
            matches: query === '(pointer: coarse)',
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
          }) as unknown as MediaQueryList
      );
      // jsdom has no modal dialog support.
      const close = vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      });
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.setAttribute('open', '');
        },
      });
      Object.defineProperty(HTMLDialogElement.prototype, 'close', {
        configurable: true,
        value: close,
      });
      return close;
    }

    afterEach(() => {
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    });

    it('should keep the sheet open during its exit and close it after the animation ends', async () => {
      const close = mockSheet();
      const { user, trigger } = renderSelect();

      await user.click(trigger);
      const sheet = screen.getByRole('dialog', { name: 'Language' });
      await user.keyboard('{Escape}');

      expect(sheet).toHaveAttribute('open');
      expect(sheet).toHaveAttribute('data-closing');
      expect(close).not.toHaveBeenCalled();

      fireEvent.animationEnd(sheet);

      expect(close).toHaveBeenCalledTimes(1);
      expect(sheet).not.toHaveAttribute('open');
      expect(sheet).not.toHaveAttribute('data-closing');
    });

    it("should ignore the backdrop's animation ending", async () => {
      const close = mockSheet();
      const { user, trigger } = renderSelect();

      await user.click(trigger);
      const sheet = screen.getByRole('dialog', { name: 'Language' });
      await user.keyboard('{Escape}');
      const backdropEnd = new AnimationEvent('animationend', { bubbles: true });
      Object.defineProperty(backdropEnd, 'pseudoElement', { value: '::backdrop' });
      fireEvent(sheet, backdropEnd);

      expect(close).not.toHaveBeenCalled();
      expect(sheet).toHaveAttribute('data-closing');
    });

    it('should ignore an animation that ends on a child of the sheet', async () => {
      const close = mockSheet();
      const { user, trigger } = renderSelect();

      await user.click(trigger);
      await user.keyboard('{Escape}');
      fireEvent.animationEnd(screen.getByRole('option', { name: 'English', hidden: true }));

      expect(close).not.toHaveBeenCalled();
    });

    it('should keep the sheet open when it reopens during the exit', async () => {
      const close = mockSheet();
      const { user, trigger } = renderSelect();

      await user.click(trigger);
      const sheet = screen.getByRole('dialog', { name: 'Language' });
      await user.keyboard('{Escape}');
      await user.click(trigger);

      expect(sheet).not.toHaveAttribute('data-closing');

      fireEvent.animationEnd(sheet);

      expect(close).not.toHaveBeenCalled();
      expect(sheet).toHaveAttribute('open');
    });
  });

  it('should flag a list whose options have icons, so the check moves to the end', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Select aria-label="Theme" options={themes} defaultValue="light" />
        <Select aria-label="Language" options={languages} />
      </>
    );

    await user.click(screen.getByRole('combobox', { name: 'Theme' }));
    expect(screen.getByRole('listbox', { name: 'Theme' })).toHaveAttribute('data-icons');

    await user.click(screen.getByRole('combobox', { name: 'Language' }));
    expect(screen.getByRole('listbox', { name: 'Language' })).not.toHaveAttribute('data-icons');
  });

  it('should keep the chosen label as the spoken value when only its icon shows', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select
        aria-label="Theme"
        options={themes}
        defaultValue="light"
        iconOnly
        onValueChange={onValueChange}
      />
    );
    const trigger = screen.getByRole('combobox', { name: 'Theme' });

    expect(trigger).toHaveTextContent('Light');

    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'Dark' }));

    expect(onValueChange).toHaveBeenCalledWith('dark');
    expect(trigger).toHaveTextContent('Dark');
  });

  it('should forward its ref to the trigger', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Select aria-label="Language" options={languages} ref={ref} />);

    expect(ref.current).toBe(screen.getByRole('combobox', { name: 'Language' }));
  });
});
