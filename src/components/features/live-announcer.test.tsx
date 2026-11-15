import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveAnnouncerProvider, useAnnounce } from './live-announcer';

function AnnounceButton({ message }: { message: string }) {
  const announce = useAnnounce();
  return <button onClick={() => announce(message)}>Announce</button>;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('LiveAnnouncerProvider', () => {
  it('should announce a message in a polite status region', () => {
    vi.useFakeTimers();
    render(
      <LiveAnnouncerProvider>
        <AnnounceButton message="Timer started" />
      </LiveAnnouncerProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Announce' }));

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveTextContent('');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Timer started');
  });

  it('should announce the same message again', () => {
    vi.useFakeTimers();
    render(
      <LiveAnnouncerProvider>
        <AnnounceButton message="Timer started" />
      </LiveAnnouncerProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Announce' }));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Timer started');

    fireEvent.click(screen.getByRole('button', { name: 'Announce' }));
    expect(screen.getByRole('status')).toHaveTextContent('');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Timer started');
  });
});
