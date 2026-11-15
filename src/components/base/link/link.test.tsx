import { fireEvent, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Link as WouterLink, Route } from 'wouter';
import styles from './link.module.css';
import { Link } from './link';

describe('Link', () => {
  it('should use the router for internal links and a native anchor for external links with the same styling', () => {
    const navigate = vi.fn();
    function RouterLink({
      children,
      href,
      onClick,
      ...props
    }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
      return (
        <a
          {...props}
          href={href}
          onClick={(event) => {
            event.preventDefault();
            onClick?.(event);
            navigate(href);
          }}
        >
          {children}
        </a>
      );
    }

    render(
      <>
        <Link href="/guides" linkComponent={RouterLink}>
          Internal
        </Link>
        <Link
          href="https://example.com"
          external
          linkComponent={RouterLink}
          onClick={(event) => event.preventDefault()}
        >
          External
        </Link>
      </>
    );

    const internal = screen.getByRole('link', { name: 'Internal' });
    const external = screen.getByRole('link', { name: 'External' });
    expect(internal).toHaveClass(styles.link);
    expect(external).toHaveClass(styles.link);
    expect(external).toHaveAttribute('href', 'https://example.com');
    fireEvent.click(internal);
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/guides');
    fireEvent.click(external, { ctrlKey: true });
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('should navigate through Wouter without reloading the page', () => {
    window.history.replaceState({}, '', '/');
    render(
      <>
        <Link href="/guides" linkComponent={WouterLink}>
          Guide
        </Link>
        <Route path="/guides">Guide page</Route>
      </>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Guide' }));
    expect(screen.getByText('Guide page')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/guides');
    window.history.replaceState({}, '', '/');
  });

  it('should render a named link with its destination', () => {
    render(<Link href="/guides">Read the guide</Link>);

    expect(screen.getByRole('link', { name: 'Read the guide' })).toHaveAttribute('href', '/guides');
  });
});
