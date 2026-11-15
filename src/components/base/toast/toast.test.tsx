import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, type ToastPosition } from './toast';
import { useToast, type ToastOptions } from './toast-context';

function Trigger(options: ToastOptions) {
  const showToast = useToast();

  return (
    <button type="button" onClick={() => showToast(options)}>
      Show toast
    </button>
  );
}

function finishExit() {
  fireEvent.transitionEnd(screen.getByRole('listitem'), { propertyName: 'opacity' });
}

function renderWithToast(options: ToastOptions, position?: ToastPosition) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(
    <ToastProvider position={position}>
      <Trigger {...options} />
    </ToastProvider>
  );
  return { user };
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should keep an empty log region mounted before any toast appears', () => {
    renderWithToast({ message: 'Saved' });

    expect(screen.getByRole('log')).toBeEmptyDOMElement();
    expect(screen.getByRole('region', { name: 'Notifications' })).not.toContainElement(
      screen.getByRole('log')
    );
  });

  it('should announce a short toast through the log region and list it visually', async () => {
    const { user } = renderWithToast({ message: 'Draft saved' });

    await user.click(screen.getByRole('button', { name: 'Show toast' }));

    expect(screen.getByRole('log')).toHaveTextContent('Draft saved');
    expect(within(screen.getByRole('listitem')).getByText('Draft saved')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('should put a toast that needs the reader in an alert dialog and keep it out of the log region', async () => {
    const { user } = renderWithToast({ message: 'Upload failed', tone: 'danger' });

    await user.click(screen.getByRole('button', { name: 'Show toast' }));

    const dialog = screen.getByRole('alertdialog', { name: 'Error' });
    expect(dialog).toHaveAccessibleDescription('Upload failed');
    expect(screen.getByRole('log')).toBeEmptyDOMElement();
    expect(screen.getByRole('list')).not.toHaveAttribute('aria-live');
  });

  it('should hide the toast after its duration', async () => {
    const { user } = renderWithToast({ message: 'Draft saved', duration: 3000 });

    await user.click(screen.getByRole('button', { name: 'Show toast' }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    finishExit();

    expect(screen.queryByText('Draft saved')).not.toBeInTheDocument();
  });

  it('should keep a dismissed toast on screen while it fades out', async () => {
    const { user } = renderWithToast({ message: 'Draft saved', duration: null });

    await user.click(screen.getByRole('button', { name: 'Show toast' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));

    expect(screen.getByText('Draft saved')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText('Draft saved')).toBeInTheDocument();
    finishExit();
    expect(screen.queryByText('Draft saved')).not.toBeInTheDocument();
  });

  it('should keep a leaving toast when an end event bubbles from a child', async () => {
    const { user } = renderWithToast({ message: 'Draft saved', duration: null });

    await user.click(screen.getByRole('button', { name: 'Show toast' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    fireEvent.transitionEnd(screen.getByText('Draft saved'), { propertyName: 'opacity' });

    expect(screen.getByText('Draft saved')).toBeInTheDocument();
  });

  it('should keep a leaving toast when an unrelated property finishes on it', async () => {
    const { user } = renderWithToast({ message: 'Draft saved', duration: null });

    await user.click(screen.getByRole('button', { name: 'Show toast' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    fireEvent.transitionEnd(screen.getByRole('listitem'), { propertyName: 'grid-template-rows' });

    expect(screen.getByText('Draft saved')).toBeInTheDocument();
  });

  it('should make a leaving toast inert so its dismiss button cannot be pressed again', async () => {
    const { user } = renderWithToast({ message: 'Draft saved', duration: null });

    await user.click(screen.getByRole('button', { name: 'Show toast' }));
    const dismiss = screen.getByRole('button', { name: 'Dismiss notification' });
    const item = screen.getByRole('listitem');
    expect(item).not.toHaveAttribute('inert');
    await user.click(dismiss);

    expect(item).toHaveAttribute('inert');
  });

  it('should pause the timer while the pointer is over the toast', async () => {
    const { user } = renderWithToast({ message: 'Draft saved', duration: 3000 });

    await user.click(screen.getByRole('button', { name: 'Show toast' }));
    await user.hover(within(screen.getByRole('listitem')).getByText('Draft saved'));
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByRole('listitem')).not.toHaveAttribute('inert');
  });

  it('should keep a danger toast until it is dismissed', async () => {
    const { user } = renderWithToast({ message: 'Upload failed', tone: 'danger' });

    await user.click(screen.getByRole('button', { name: 'Show toast' }));
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByText('Upload failed')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    finishExit();

    expect(screen.queryByText('Upload failed')).not.toBeInTheDocument();
  });

  it('should keep a warning toast until it is dismissed', async () => {
    const { user } = renderWithToast({ message: 'Backup is 14 days old', tone: 'warning' });

    await user.click(screen.getByRole('button', { name: 'Show toast' }));
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(screen.getByText('Backup is 14 days old')).toBeInTheDocument();
  });

  it.each(['success', 'danger', 'info', 'warning'] as const)(
    'should draw only the dismiss icon on a %s toast when icon is false',
    async (tone) => {
      const { user } = renderWithToast({ message: 'Message', tone, icon: false, duration: null });
      await user.click(screen.getByRole('button', { name: 'Show toast' }));

      expect(
        within(screen.getByRole('listitem')).getAllByRole('img', { hidden: true })
      ).toHaveLength(1);
    }
  );

  it('should run the action and dismiss the toast when the action is pressed', async () => {
    const onAction = vi.fn();
    const { user } = renderWithToast({
      message: 'Walk deleted',
      action: { label: 'Undo', onAction },
    });

    await user.click(screen.getByRole('button', { name: 'Show toast' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(onAction).toHaveBeenCalledTimes(1);
    finishExit();
    expect(screen.queryByText('Walk deleted')).not.toBeInTheDocument();
  });

  it('should show no action button when none is given', async () => {
    const { user } = renderWithToast({ message: 'Draft saved' });

    await user.click(screen.getByRole('button', { name: 'Show toast' }));

    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(within(region).getAllByRole('button')).toHaveLength(1);
  });

  it('should throw when useToast runs outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Trigger message="Saved" />)).toThrow(/ToastProvider/);
  });

  it('should take focus for a toast that stays, and give it back on dismiss', async () => {
    const { user } = renderWithToast({ message: 'Upload failed', tone: 'danger' });
    const opener = screen.getByRole('button', { name: 'Show toast' });
    await user.click(opener);

    expect(screen.getByRole('button', { name: 'Dismiss notification' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(opener).toHaveFocus();
  });

  it('should focus the action first on a toast that carries one', async () => {
    const { user } = renderWithToast({
      message: 'Walk deleted',
      action: { label: 'Undo', onAction: vi.fn() },
    });
    const opener = screen.getByRole('button', { name: 'Show toast' });
    await user.click(opener);

    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(opener).toHaveFocus();
  });

  it('should keep a toast with an action while focus is on it', async () => {
    const { user } = renderWithToast({
      message: 'Walk deleted',
      action: { label: 'Undo', onAction: vi.fn() },
    });
    await user.click(screen.getByRole('button', { name: 'Show toast' }));

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
    expect(screen.getByRole('listitem')).not.toHaveAttribute('inert');
  });

  it('should leave focus where it is for a short toast with no action', async () => {
    const { user } = renderWithToast({ message: 'Saved', tone: 'success' });
    const opener = screen.getByRole('button', { name: 'Show toast' });
    await user.click(opener);

    expect(opener).toHaveFocus();
  });
});
