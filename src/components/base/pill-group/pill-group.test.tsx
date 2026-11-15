import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PillGroup, type PillOption } from './pill-group';

const topics: PillOption[] = [
  { value: 'design', label: 'design' },
  { value: 'writing', label: 'writing' },
  { value: 'code', label: 'code' },
];

const days: PillOption[] = [
  { value: 'mon', label: 'Monday', shortLabel: 'M' },
  { value: 'tue', label: 'Tuesday', shortLabel: 'T' },
];

function Harness({ initial = [] }: { initial?: string[] }) {
  const [value, setValue] = useState(initial);

  return <PillGroup legend="topics" options={topics} value={value} onChange={setValue} />;
}

describe('PillGroup', () => {
  it('should name the group by its legend', () => {
    render(<Harness />);

    expect(screen.getByRole('group', { name: 'topics' })).toBeInTheDocument();
  });

  it('should associate a description with the group', () => {
    render(
      <div>
        <PillGroup
          legend="topics"
          options={topics}
          value={[]}
          onChange={() => {}}
          aria-describedby="topics-error"
        />
        <p id="topics-error">Choose at least one topic</p>
      </div>
    );

    expect(screen.getByRole('group', { name: 'topics' })).toHaveAttribute(
      'aria-describedby',
      'topics-error'
    );
  });

  it('should name a short-label pill by its full label', () => {
    render(<PillGroup legend="repeat on" options={days} value={[]} onChange={() => {}} />);

    expect(screen.getByRole('checkbox', { name: 'Monday' })).toBeInTheDocument();
  });

  it('should reflect the chosen values as checked', () => {
    render(<Harness initial={['design', 'code']} />);

    expect(screen.getByRole('checkbox', { name: 'design' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'writing' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'code' })).toBeChecked();
  });

  it('should add a clicked value in options order', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PillGroup legend="topics" options={topics} value={['code']} onChange={onChange} />);

    await user.click(screen.getByRole('checkbox', { name: 'design' }));

    expect(onChange).toHaveBeenCalledWith(['design', 'code']);
  });

  it('should remove a chosen value when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PillGroup legend="topics" options={topics} value={['design', 'code']} onChange={onChange} />
    );

    await user.click(screen.getByRole('checkbox', { name: 'design' }));

    expect(onChange).toHaveBeenCalledWith(['code']);
  });

  it('should keep the legend available to assistive technology when hidden', () => {
    render(
      <PillGroup legend="topics" options={topics} value={[]} onChange={() => {}} hideLegend />
    );

    expect(screen.getByRole('group', { name: 'topics' })).toBeInTheDocument();
    expect(screen.getByText('topics', { selector: 'legend' })).toHaveClass('sr-only');
  });

  it('should draw an option icon without changing the pill name', () => {
    const Icon = ({ className }: { className?: string }) => (
      <svg data-testid="icon" aria-hidden="true" className={className} />
    );
    render(
      <PillGroup
        legend="topics"
        options={[{ value: 'design', label: 'design', icon: Icon }]}
        value={[]}
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('checkbox', { name: 'design' })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
