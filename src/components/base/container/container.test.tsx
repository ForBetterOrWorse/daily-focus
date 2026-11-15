import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import styles from './container.module.css';
import { Container } from './container';

describe('Container', () => {
  it('should render a semantic element selected with as and pass through its attributes', () => {
    render(
      <Container as="main" aria-label="Page content" className="page-main" data-testid="container">
        Content
      </Container>
    );

    const main = screen.getByRole('main', { name: 'Page content' });
    expect(main).toHaveAttribute('data-testid', 'container');
    expect(main).toHaveClass('page-main');
    expect(main).toHaveTextContent('Content');
  });

  it('should render a div by default', () => {
    render(<Container data-testid="container">Content</Container>);

    expect(screen.getByTestId('container').tagName).toBe('DIV');
  });

  it.each(['sm', 'md', 'lg', 'xl', 'full'] as const)('should apply the %s size class', (size) => {
    render(
      <Container size={size} data-testid="container">
        Content
      </Container>
    );

    expect(screen.getByTestId('container')).toHaveClass(styles[size]);
  });
});
