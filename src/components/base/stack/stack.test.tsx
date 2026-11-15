import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/base/button/button';
import styles from './stack.module.css';
import { Stack } from './stack';

function mountStack(props: Omit<Parameters<typeof Stack>[0], 'children'> = {}) {
  render(
    <Stack label="Actions" {...props}>
      <Button variant="primary">Save</Button>
    </Stack>
  );

  return screen.getByRole('group', { name: 'Actions' });
}

describe('Stack', () => {
  it('should render its children in order', () => {
    render(
      <Stack>
        <Button variant="primary">Cancel</Button>
        <Button variant="cta">Save</Button>
      </Stack>
    );

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Cancel',
      'Save',
    ]);
  });

  it('should name the group when given a label', () => {
    render(
      <Stack label="Item actions">
        <Button variant="ghost" icon={() => <svg aria-hidden="true" />} aria-label="Edit" />
      </Stack>
    );

    expect(screen.getByRole('group', { name: 'Item actions' })).toBeInTheDocument();
  });

  it('should not expose a group role without a label', () => {
    render(
      <Stack>
        <Button variant="primary">Save</Button>
      </Stack>
    );

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it.each([
    { props: { direction: 'column' as const }, className: 'column' },
    { props: { direction: 'responsive' as const }, className: 'responsive' },
    { props: { justify: 'center' as const }, className: 'justify-center' },
    { props: { justify: 'end' as const }, className: 'justify-end' },
    { props: { justify: 'between' as const }, className: 'justify-between' },
    { props: { align: 'start' as const }, className: 'align-start' },
    { props: { align: 'center' as const }, className: 'align-center' },
    { props: { align: 'end' as const }, className: 'align-end' },
    { props: { align: 'stretch' as const }, className: 'align-stretch' },
    { props: { gap: 'xxs' as const }, className: 'gap-xxs' },
    { props: { columnGap: 'xxs' as const }, className: 'column-gap-xxs' },
    { props: { rowGap: 'xxs' as const }, className: 'row-gap-xxs' },
    { props: { wrap: false }, className: 'nowrap' },
  ])('should map $className to its layout class', ({ props, className }) => {
    expect(mountStack(props)).toHaveClass(styles[className]);
  });

  it('should render a list element with the list reset', () => {
    render(
      <Stack as="ul">
        <li>One</li>
      </Stack>
    );

    const list = screen.getByRole('list');

    expect(list.tagName).toBe('UL');
    expect(list).toHaveClass(styles.list);
  });
});
