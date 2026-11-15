import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CardLink } from './card';

describe('Card', () => {
  it('should render a div by default', () => {
    render(<Card>Weekly summary</Card>);

    expect(screen.getByText('Weekly summary').tagName).toBe('DIV');
  });

  it('should render the element passed in as', () => {
    render(
      <ul>
        <Card as="li">First lesson</Card>
      </ul>
    );

    expect(screen.getByRole('listitem')).toHaveTextContent('First lesson');
  });

  it('should render an article with a named link when used as a link card', () => {
    render(
      <Card as="article">
        <h2>
          <CardLink href="/lessons/flexbox">Flexbox basics</CardLink>
        </h2>
        <p>Lay out a row of items.</p>
      </Card>
    );

    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Flexbox basics' })).toHaveAttribute(
      'href',
      '/lessons/flexbox'
    );
  });
});

describe('Card with a title', () => {
  it('should render the title as a level 2 heading by default', () => {
    render(<Card title="Backup" />);

    expect(screen.getByRole('heading', { level: 2, name: 'Backup' })).toBeInTheDocument();
  });

  it('should render the heading level it is given', () => {
    render(<Card title="Backup" headingLevel={3} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Backup' })).toBeInTheDocument();
  });

  it('should show the description and the action beside the title', () => {
    render(
      <Card
        title="Groups"
        description="Sort items into groups."
        action={<button type="button">Add group</button>}
      />
    );

    expect(screen.getByText('Sort items into groups.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add group' })).toBeVisible();
  });

  it('should pass props to the heading', () => {
    render(<Card title="Backup" headingProps={{ id: 'backup', tabIndex: -1 }} />);

    expect(screen.getByRole('heading', { name: 'Backup' })).toHaveAttribute('id', 'backup');
  });
});
