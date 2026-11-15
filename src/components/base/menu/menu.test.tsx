import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Menu, type MenuItem } from './menu';

function renderMenu(overrides: Partial<Record<string, Partial<MenuItem>>> = {}) {
  const items: MenuItem[] = [
    { label: 'Rename', onSelect: vi.fn() },
    { label: 'Duplicate', onSelect: vi.fn() },
    { label: 'Archive', onSelect: vi.fn() },
    { label: 'Delete', onSelect: vi.fn(), danger: true },
  ].map((item) => ({ ...item, ...overrides[item.label] }));

  render(
    <>
      <Menu label="Actions" items={items} />
      <button type="button">Outside</button>
    </>
  );
  return { items, trigger: screen.getByRole('button', { name: 'Actions' }) };
}

describe('Menu', () => {
  it('should name an icon-only trigger with its label', () => {
    render(<Menu label="Timer style" icon={() => <svg aria-hidden="true" />} items={[]} />);

    const trigger = screen.getByRole('button', { name: 'Timer style' });

    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).not.toHaveTextContent('Timer style');
  });

  it('should mark the current choice of a single-choice group', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Menu
        label="Timer style"
        items={[
          { label: 'Focus timer', onSelect: vi.fn(), checked: true },
          { label: 'Stopwatch', onSelect, checked: false },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Timer style' }));

    expect(screen.getByRole('menuitemradio', { name: 'Focus timer' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await user.click(screen.getByRole('menuitemradio', { name: 'Stopwatch' }));

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('should lead each item with its icon', async () => {
    const user = userEvent.setup();
    render(
      <Menu
        label="Timer style"
        items={[
          {
            label: 'Focus blocks',
            icon: <svg data-testid="blocks-icon" aria-hidden="true" />,
            onSelect: vi.fn(),
            checked: true,
          },
          {
            label: 'Free run',
            icon: <svg aria-hidden="true" />,
            onSelect: vi.fn(),
            checked: false,
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Timer style' }));
    const item = screen.getByRole('menuitemradio', { name: 'Focus blocks' });
    const icon = within(item).getByTestId('blocks-icon');
    const label = within(item).getByText('Focus blocks');

    expect(icon.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  it('should start closed with a collapsed menu button', () => {
    const { trigger } = renderMenu();

    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('should open on click and focus the first item', async () => {
    const user = userEvent.setup();
    const { trigger } = renderMenu();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Actions' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toHaveFocus();
  });

  it('should open on ArrowUp and focus the last item', async () => {
    const user = userEvent.setup();
    const { trigger } = renderMenu();

    trigger.focus();
    await user.keyboard('{ArrowUp}');

    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
  });

  it('should move focus with the arrow keys, wrap, and jump with Home and End', async () => {
    const user = userEvent.setup();
    const { trigger } = renderMenu();

    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toHaveFocus();

    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toHaveFocus();
  });

  it('should jump to the next item that starts with a typed letter', async () => {
    const user = userEvent.setup();
    const { trigger } = renderMenu();

    await user.click(trigger);
    await user.keyboard('d');
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus();

    await user.keyboard('d');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
  });

  it('should run the item, close, and return focus to the trigger when an item is chosen', async () => {
    const user = userEvent.setup();
    const { items, trigger } = renderMenu();

    await user.click(trigger);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(items[1].onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('should close on Escape and return focus to the trigger', async () => {
    const user = userEvent.setup();
    const { trigger } = renderMenu();

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('should close when the pointer goes down outside', async () => {
    const user = userEvent.setup();
    const { trigger } = renderMenu();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Outside' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('should move focus to the item the pointer moves over', async () => {
    const user = userEvent.setup();
    const { trigger } = renderMenu();

    await user.click(trigger);
    const archive = screen.getByRole('menuitem', { name: 'Archive' });
    await user.hover(archive);

    expect(archive).toHaveFocus();
  });

  it('should keep a disabled item focusable but ignore it when chosen', async () => {
    const user = userEvent.setup();
    const { items, trigger } = renderMenu({ Archive: { disabled: true } });

    await user.click(trigger);
    const archive = screen.getByRole('menuitem', { name: 'Archive' });
    expect(archive).toHaveAttribute('aria-disabled', 'true');

    await user.click(archive);

    expect(items[2].onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeVisible();
  });
});
