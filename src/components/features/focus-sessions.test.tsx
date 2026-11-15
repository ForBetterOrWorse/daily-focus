import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FocusSessions } from './focus-sessions';

describe('FocusSessions', () => {
  it('should label a focus session with its place in the four', () => {
    render(<FocusSessions round={2} phase="focus" progress={0.5} />);
    expect(screen.getByRole('img', { name: 'Focus 2 of 4' })).toBeInTheDocument();
  });

  it('should label a break by the focus session before it', () => {
    render(<FocusSessions round={2} phase="break" progress={0} />);
    expect(screen.getByRole('img', { name: 'Break after focus 2 of 4' })).toBeInTheDocument();
  });

  it('should label the break after the last focus session as the long break', () => {
    render(<FocusSessions round={4} phase="break" progress={0} />);
    expect(screen.getByRole('img', { name: 'Long break' })).toBeInTheDocument();
  });
});
