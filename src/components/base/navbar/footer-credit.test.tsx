import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import linkStyles from '@/components/base/link/link.module.css';
import { FbowFooterCredit } from './footer-credit';

describe('FbowFooterCredit', () => {
  it('should render the default sentence', () => {
    render(<FbowFooterCredit href="/about" />);

    expect(screen.getByRole('contentinfo')).toHaveTextContent('Made by the ForBetterOrWorse team.');
  });

  it('should give the brand link its visible name', () => {
    render(<FbowFooterCredit href="/about" />);

    const link = screen.getByRole('link', { name: 'ForBetterOrWorse' });
    expect(link).toHaveAttribute('href', '/about');
    expect(link).toHaveClass(linkStyles.link);
  });

  it('should render the tagline when given', () => {
    render(<FbowFooterCredit href="/about" tagline="A sample project tagline." />);

    expect(screen.getByRole('contentinfo')).toHaveTextContent('A sample project tagline.');
  });

  it('should omit the tagline when not given', () => {
    render(<FbowFooterCredit href="/about" />);

    expect(screen.getByRole('contentinfo')).not.toHaveTextContent('A sample project tagline.');
  });
});
