import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from './drawer';
import styles from './drawer.module.css';

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    onClose?.();
    setOpen(false);
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <Drawer open={open} onClose={close} title="Test drawer">
        <Drawer.Body>
          <p>drawer content</p>
        </Drawer.Body>
      </Drawer>
    </>
  );
}

describe('Drawer', () => {
  it('should render nothing while closed', () => {
    render(<Harness />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should show the title and content when open', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'open' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test drawer')).toBeInTheDocument();
    expect(screen.getByText('drawer content')).toBeInTheDocument();
  });

  it('should slide from the bottom when requested', () => {
    render(
      <Drawer open onClose={() => {}} title="Bottom drawer" slideFrom="bottom">
        <Drawer.Body>
          <p>drawer content</p>
        </Drawer.Body>
      </Drawer>
    );

    expect(screen.getByRole('dialog')).toHaveClass(styles.panel, styles['panel-bottom']);
  });

  it('should render header content below the title row', () => {
    render(
      <>
        <button type="button" onClick={() => {}}>
          open
        </button>
        <Drawer
          open
          onClose={() => {}}
          title="Test drawer"
          headerContent={<input aria-label="Search lessons" />}
        >
          <Drawer.Body>
            <p>drawer content</p>
          </Drawer.Body>
        </Drawer>
      </>
    );

    expect(screen.getByRole('heading', { name: 'Test drawer' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search lessons' })).toBeInTheDocument();
  });

  it('should place the subtitle inline with the title when requested', () => {
    render(
      <Drawer
        open
        onClose={() => {}}
        title="Lessons"
        subtitle={<span>2/6 completed</span>}
        subtitlePlacement="inline"
      >
        <Drawer.Body>
          <p>drawer content</p>
        </Drawer.Body>
      </Drawer>
    );

    expect(
      screen.getByText('Lessons', {
        selector: `.${styles['heading-inline']} > h2`,
      })
    ).toBeInTheDocument();
    expect(screen.getByText('2/6 completed')).toBeInTheDocument();
  });

  it('should close when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(screen.getByRole('button', { name: 'close' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should close on Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should move focus into the drawer when it mounts already open', () => {
    render(
      <Drawer open onClose={() => {}} title="Mounted open">
        <Drawer.Body>
          <p>drawer content</p>
        </Drawer.Body>
      </Drawer>
    );

    expect(screen.getByRole('button', { name: 'close' })).toHaveFocus();
  });

  it('should stay open when a control inside already handled Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Drawer open onClose={onClose} title="Drawer with a list">
        <Drawer.Body>
          <input
            aria-label="Inner control"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
              }
            }}
          />
        </Drawer.Body>
      </Drawer>
    );

    await user.click(screen.getByRole('textbox', { name: 'Inner control' }));
    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should stay mounted during the exit and unmount after the panel animation ends', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(screen.getByRole('button', { name: 'close' }));

    expect(screen.getByRole('dialog')).toHaveClass(styles.closing);
    expect(screen.getByRole('button', { name: 'open' })).toHaveFocus();

    fireEvent.animationEnd(screen.getByRole('dialog'));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should stay mounted when an animation ends on a child during the exit', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(screen.getByRole('button', { name: 'close' }));
    fireEvent.animationEnd(screen.getByText('drawer content'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should stay open when it reopens during the exit', async () => {
    const { rerender } = render(
      <Drawer open onClose={() => {}} title="Test drawer">
        <Drawer.Body>content</Drawer.Body>
      </Drawer>
    );

    rerender(
      <Drawer open={false} onClose={() => {}} title="Test drawer">
        <Drawer.Body>content</Drawer.Body>
      </Drawer>
    );
    rerender(
      <Drawer open onClose={() => {}} title="Test drawer">
        <Drawer.Body>content</Drawer.Body>
      </Drawer>
    );
    fireEvent.animationEnd(screen.getByRole('dialog'));

    expect(screen.getByRole('dialog')).not.toHaveClass(styles.closing);
  });
});
