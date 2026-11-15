import { createElement, type ComponentPropsWithoutRef, type ElementType } from 'react';
import styles from './container.module.css';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

type ContainerOwnProps<T extends ElementType> = {
  as?: T;
  /** Maximum width. `full` (default) has no maximum. */
  size?: ContainerSize;
  className?: string;
};

export type ContainerProps<T extends ElementType = 'div'> = ContainerOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof ContainerOwnProps<T>>;

export function Container<T extends ElementType = 'div'>({
  as,
  size = 'full',
  className,
  ...props
}: ContainerProps<T>) {
  const Element = as ?? 'div';

  return createElement(Element, {
    ...props,
    className: [styles.container, styles[size], className].filter(Boolean).join(' '),
  });
}
