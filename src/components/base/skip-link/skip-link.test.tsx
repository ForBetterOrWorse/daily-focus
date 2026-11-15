import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SkipLink } from './skip-link';

describe('SkipLink', () => {
  it('should move keyboard focus to its target', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink targetId="main-content">Skip to main content</SkipLink>
        <main id="main-content" tabIndex={-1}>
          Main content
        </main>
      </>
    );

    const link = screen.getByRole('link', { name: 'Skip to main content' });
    expect(link).toHaveAttribute('href', '#main-content');

    await user.tab();
    expect(link).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('should respect a prevented click', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink onClick={(event) => event.preventDefault()} targetId="main-content">
          Skip to main content
        </SkipLink>
        <main id="main-content" tabIndex={-1}>
          Main content
        </main>
      </>
    );

    await user.click(screen.getByRole('link', { name: 'Skip to main content' }));

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus();
    expect(screen.getByRole('main')).not.toHaveFocus();
  });
});
