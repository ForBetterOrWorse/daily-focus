import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KbdCombo } from './kbd-combo';

describe('KbdCombo', () => {
  it('should render each key as a kbd chip', () => {
    render(<KbdCombo keys={['Alt', 'K']} />);

    // On non-Mac (test env), Alt stays 'Alt'.
    expect(screen.getByText('Alt', { selector: 'kbd' })).toBeInTheDocument();
    expect(screen.getByText('K', { selector: 'kbd' })).toBeInTheDocument();
  });

  it('should render a + separator between ASCII keys', () => {
    render(<KbdCombo keys={['Alt', 'K']} />);

    // On non-Mac (test env), Alt stays 'Alt' — an ASCII word, so + is shown.
    expect(screen.getByText('+')).toBeInTheDocument();
  });

  it('should resolve Alt to the platform alt label', () => {
    render(<KbdCombo keys={['Alt']} />);

    expect(screen.getByText(/^(Alt|⌥)$/, { selector: 'kbd' })).toBeInTheDocument();
  });

  it('should resolve Cmd to the platform modifier label', () => {
    render(<KbdCombo keys={['Cmd']} />);

    expect(screen.getByText(/^(⌘|Ctrl)$/, { selector: 'kbd' })).toBeInTheDocument();
  });

  it('should suppress the + separator when the preceding key is a non-ASCII symbol by default', () => {
    // ⌥ is a single non-ASCII char, so it has no plus separator before the next key.
    render(<KbdCombo keys={['⌥', 'K']} />);

    expect(screen.queryByText('+')).not.toBeInTheDocument();
  });

  it('should always render the + separator when separateAll is true', () => {
    render(<KbdCombo keys={['⌥', 'K']} separateAll />);

    expect(screen.getByText('+')).toBeInTheDocument();
  });

  it('should render minimal keycaps without a separator', () => {
    render(<KbdCombo keys={['Alt', 'K']} minimal />);

    expect(screen.queryByText('+')).not.toBeInTheDocument();
    expect(screen.getByText(/^(Alt|⌥)$/, { selector: 'kbd' })).toBeInTheDocument();
    expect(screen.getByText('K', { selector: 'kbd' })).toBeInTheDocument();
  });
});
