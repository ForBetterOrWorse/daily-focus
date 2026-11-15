import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Streak } from './streak';

describe('Streak', () => {
  it('should read 0 days on the gray drop with no streak', () => {
    render(<Streak days={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('days')).toBeInTheDocument();
    expect(screen.getByText('0-day streak')).toBeInTheDocument();
  });

  it('should read 1 day in the singular on the orange drop', () => {
    render(<Streak days={1} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('day')).toBeInTheDocument();
    expect(screen.queryByText('days')).not.toBeInTheDocument();
  });

  it('should read a two-digit count', () => {
    render(<Streak days={17} />);
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('days')).toBeInTheDocument();
    expect(screen.getByText('17-day streak')).toBeInTheDocument();
  });

  it('should be plain text with no link or button', () => {
    render(<Streak days={5} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
