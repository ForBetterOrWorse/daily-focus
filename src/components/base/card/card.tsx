import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import styles from './card.module.css';

interface CardHeaderProps {
  title: ReactNode;
  /** Defaults to 2. Pick the level that fits the page outline. */
  headingLevel?: 2 | 3 | 4;
  /** Passed to the heading, for example an `id` that a link can target. */
  headingProps?: Omit<HTMLAttributes<HTMLHeadingElement>, 'children'>;
  description?: ReactNode;
  /** Sits at the inline end of the title row. */
  action?: ReactNode;
}

type NoCardHeader = { [Key in keyof CardHeaderProps]?: undefined };

export type CardProps = {
  as?: 'div' | 'article' | 'section' | 'li';
  children?: ReactNode;
  className?: string;
} & (CardHeaderProps | NoCardHeader);

/**
 * A `title` adds a header as the card's first row. The header holds the title and the optional
 * description as one block that owns the space between them, so the space below the header comes
 * from the card's own gap whether or not a description is present.
 */
export function Card({
  as: Element = 'div',
  children,
  className,
  title,
  headingLevel = 2,
  headingProps,
  description,
  action,
}: CardProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <Element className={[styles.card, className].filter(Boolean).join(' ')}>
      {title === undefined ? null : (
        <div className={styles.header}>
          <div className={styles['header-row']}>
            <Heading
              {...headingProps}
              className={[styles['header-title'], headingProps?.className]
                .filter(Boolean)
                .join(' ')}
            >
              {title}
            </Heading>
            {action}
          </div>
          {description ? <p className={styles['header-description']}>{description}</p> : null}
        </div>
      )}
      {children}
    </Element>
  );
}

export interface CardLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
}

/** The card's one main link. It stretches over the whole card, so the card becomes clickable. */
export function CardLink({ className, children, ...rest }: CardLinkProps) {
  return (
    <a className={[styles.link, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </a>
  );
}
