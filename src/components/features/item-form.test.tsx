import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ItemInput } from '@/domain/items';
import { emptyData } from '@/domain/schema';
import { reduce } from '@/domain/reduce';
import { ItemForm } from './item-form';

function renderForm(kind: 'habit' | 'task' = 'task') {
  const onSave = vi.fn<(item: ItemInput, today?: number) => void>();
  const onCancel = vi.fn();
  render(<ItemForm kind={kind} onSave={onSave} onCancel={onCancel} />);
  return { onSave, onCancel };
}

describe('ItemForm', () => {
  it('should add a check task when the name is submitted with Enter', async () => {
    const user = userEvent.setup();
    const { onSave } = renderForm();
    const name = screen.getByRole('textbox', { name: 'Name' });

    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(screen.getByText('Enter a name for the task')).toBeVisible();

    await user.type(name, '  Write report  ');
    await user.keyboard('{Enter}');

    expect(onSave).toHaveBeenCalledWith(
      { name: 'Write report', kind: 'task', completion: 'check' },
      undefined
    );
  });

  it('should explain how to fix an invalid count goal', async () => {
    const user = userEvent.setup();
    const { onSave } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Reach a count' }));
    await user.clear(screen.getByRole('spinbutton', { name: 'Times' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Drink water');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(screen.getByText('Enter a count from 1 to 10')).toBeVisible();
    expect(onSave).not.toHaveBeenCalled();
  });

  it.each([
    { choice: 'Reach a count', label: 'Times', value: '5' },
    { choice: 'Reach a time', label: 'Minutes', value: '30' },
  ])('should prefill $label with $value', async ({ choice, label, value }) => {
    const user = userEvent.setup();
    const { onSave } = renderForm();

    await user.click(screen.getByRole('radio', { name: choice }));
    expect(screen.getByRole('spinbutton', { name: label })).toHaveValue(Number(value));

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Goal');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ target: Number(value) }),
      undefined
    );
  });

  it('should swap an untouched default when the choice changes and keep a typed value', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('radio', { name: 'Reach a count' }));
    await user.click(screen.getByRole('radio', { name: 'Reach a time' }));
    expect(screen.getByRole('spinbutton', { name: 'Minutes' })).toHaveValue(30);

    const minutes = screen.getByRole('spinbutton', { name: 'Minutes' });
    await user.clear(minutes);
    await user.type(minutes, '45');
    await user.click(screen.getByRole('radio', { name: 'Reach a count' }));
    expect(screen.getByRole('spinbutton', { name: 'Times' })).toHaveValue(45);
  });

  it.each([
    {
      choice: 'Reach a count',
      label: 'Times',
      hint: '1 to 10',
      error: 'Enter a count from 1 to 10',
      value: '11',
    },
    {
      choice: 'Reach a time',
      label: 'Minutes',
      hint: '5 to 1440 minutes',
      error: 'Enter a number of minutes from 5 to 1440',
      value: '1441',
    },
    {
      choice: 'Reach a time',
      label: 'Minutes',
      hint: '5 to 1440 minutes',
      error: 'Enter a number of minutes from 5 to 1440',
      value: '4',
    },
  ])(
    'should show the $choice range as a hint and reject $value',
    async ({ choice, label, hint, error, value }) => {
      const user = userEvent.setup();
      const { onSave } = renderForm();

      await user.click(screen.getByRole('radio', { name: choice }));
      const input = screen.getByRole('spinbutton', { name: label });
      expect(input).toHaveAccessibleDescription(hint);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Goal');
      await user.clear(input);
      await user.type(input, value);
      await user.click(screen.getByRole('button', { name: 'Add task' }));

      expect(screen.getByText(error)).toBeVisible();
      expect(onSave).not.toHaveBeenCalled();
    }
  );

  it.each([
    { value: '11', error: 'Enter a count from 0 to 10' },
    { value: '-1', error: 'Enter a count from 0 to 10' },
  ])('should reject a done today count of $value', async ({ value, error }) => {
    const user = userEvent.setup();
    const countItem = reduce(
      emptyData(0),
      {
        type: 'addItem',
        item: { name: 'Water', kind: 'task', completion: 'count', target: 8 },
      },
      0
    ).items[0];
    const onSave = vi.fn<(item: ItemInput, today?: number) => void>();
    render(
      <ItemForm
        kind="task"
        item={countItem}
        today={3}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );

    const doneToday = screen.getByRole('spinbutton', { name: 'Done today' });
    expect(doneToday).toHaveAccessibleDescription('0 to 10');
    await user.clear(doneToday);
    await user.type(doneToday, value);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByText(error)).toBeVisible();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('should require at least one habit day', async () => {
    const user = userEvent.setup();
    renderForm('habit');

    for (const day of [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]) {
      await user.click(screen.getByRole('checkbox', { name: day }));
    }
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Journal');
    await user.click(screen.getByRole('button', { name: 'Add habit' }));

    expect(screen.getByText('Pick at least one day')).toBeVisible();
  });

  it('should keep folded fields mounted and inert until their choice is selected', async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.getByLabelText('Times', { selector: 'input' })).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: 'Minutes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Timer' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Reach a time' }));
    expect(screen.getByRole('radio', { name: /Focus sessions/ })).toBeChecked();
    expect(screen.getByRole('spinbutton', { name: 'Minutes' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Timer' })).toBeVisible();

    await user.click(screen.getByRole('radio', { name: 'Check it off' }));
    expect(screen.queryByRole('spinbutton', { name: 'Minutes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Timer' })).not.toBeInTheDocument();
  });
});
