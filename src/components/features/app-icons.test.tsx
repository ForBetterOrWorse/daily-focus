import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ArrowCounterclockwiseIcon,
  ColumnsLayoutIcon,
  GripVerticalIcon,
  PauseFillIcon,
  PencilIcon,
  PlayFillIcon,
  PlusLgIcon,
  StopwatchIcon,
  TrashIcon,
} from './app-icons';

const icons = [
  PlayFillIcon,
  PauseFillIcon,
  ArrowCounterclockwiseIcon,
  PlusLgIcon,
  StopwatchIcon,
  GripVerticalIcon,
  PencilIcon,
  TrashIcon,
  ColumnsLayoutIcon,
];

describe('app icons', () => {
  it.each(icons)('should hide %s from assistive technology', (Icon) => {
    render(<Icon />);

    expect(screen.getByRole('img', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
  });
});
