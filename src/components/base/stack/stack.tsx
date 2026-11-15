import type { ReactNode } from 'react';
import styles from './stack.module.css';

type GapToken = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface StackProps {
  /** Names the group for screen readers. Leave it out when a heading nearby already names it. */
  label?: string;
  /** `responsive` is a column that becomes a row from the 600px breakpoint. */
  direction?: 'row' | 'column' | 'responsive';
  gap?: GapToken;
  /** Overrides `gap` between columns. */
  columnGap?: GapToken;
  /** Overrides `gap` between rows. */
  rowGap?: GapToken;
  /** Cross axis. Defaults to `center` in a row and `stretch` in a column. */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Main axis. */
  justify?: 'start' | 'center' | 'end' | 'between';
  /** `false` keeps a row on one line. It has no effect in a column. */
  wrap?: boolean;
  as?: 'div' | 'ul' | 'ol' | 'span';
  className?: string;
  children: ReactNode;
}

export function Stack({
  label,
  direction = 'row',
  gap = 'sm',
  columnGap,
  rowGap,
  align,
  justify = 'start',
  wrap = true,
  as: Element = 'div',
  className,
  children,
}: StackProps) {
  const resolvedClassName = [
    styles.stack,
    styles[direction],
    gap === 'sm' ? undefined : styles[`gap-${gap}`],
    columnGap ? styles[`column-gap-${columnGap}`] : undefined,
    rowGap ? styles[`row-gap-${rowGap}`] : undefined,
    align ? styles[`align-${align}`] : undefined,
    justify === 'start' ? undefined : styles[`justify-${justify}`],
    wrap ? undefined : styles.nowrap,
    Element === 'ul' || Element === 'ol' ? styles.list : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Element role={label ? 'group' : undefined} aria-label={label} className={resolvedClassName}>
      {children}
    </Element>
  );
}
