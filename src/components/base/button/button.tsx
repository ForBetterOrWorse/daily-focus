import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  MouseEvent,
  ReactNode,
  Ref,
} from 'react';
import styles from './button.module.css';
import { usePress } from './use-press';

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'cta';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonShape = 'square' | 'round';

interface BaseProps {
  variant: ButtonVariant;
  size?: ButtonSize;
  /** `square` reads the look's button corner; `round` is a full pill in every look. Defaults to `round` for an icon-only button and `square` otherwise. */
  shape?: ButtonShape;
  borderless?: boolean;
  className?: string;
}

export type ButtonIcon = ComponentType<{ className?: string }>;

/** Rejects an empty string literal. A string known only at run time passes the type check. */
type NonEmpty<Label extends string> = Label extends '' ? never : Label;

/**
 * An `icon` with no children is icon-only and takes a non-empty `aria-label`. A button with
 * children is named by them and takes no `aria-label`, so it never carries two names.
 */
type ContentProps<Label extends string> =
  | { icon: ButtonIcon; children?: undefined; 'aria-label': NonEmpty<Label> }
  | { icon?: ButtonIcon; children: ReactNode; 'aria-label'?: never };

type ButtonProps<Label extends string> = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> &
  ContentProps<Label> & {
    href?: undefined;
    ref?: Ref<HTMLButtonElement>;
  };

type LinkProps<Label extends string> = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'aria-label' | 'children'> &
  ContentProps<Label> & {
    href: string;
    ref?: Ref<HTMLAnchorElement>;
  };

export type Props<Label extends string = string> = ButtonProps<Label> | LinkProps<Label>;

function buildClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  shape: ButtonShape,
  borderless: boolean,
  iconOnly: boolean,
  className?: string
) {
  return [
    styles.button,
    styles[variant],
    styles[size],
    shape === 'round' ? styles.round : undefined,
    borderless ? styles.borderless : undefined,
    iconOnly ? styles['icon-only'] : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

function blockActivation(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
}

export function Button<Label extends string = string>(props: Props<Label>) {
  const {
    variant,
    size = 'md',
    shape: shapeProp,
    borderless = false,
    icon: Icon,
    className,
    ...rest
  } = props;
  const iconOnly = Icon !== undefined && rest.children === undefined;
  const shape = shapeProp ?? (iconOnly ? 'round' : 'square');
  const resolvedClassName = buildClassName(variant, size, shape, borderless, iconOnly, className);
  const isLink = rest.href !== undefined;
  const disabled = isLink
    ? rest['aria-disabled'] === true || rest['aria-disabled'] === 'true'
    : Boolean(rest.disabled);
  const { pressed, handlers } = usePress<HTMLElement>({
    disabled,
    spaceActivates: !isLink,
    onKeyDown: rest.onKeyDown,
    onKeyUp: rest.onKeyUp,
    onBlur: rest.onBlur,
  });

  if (isLink) {
    const { ref, children, href, onClick, ...linkRest } = rest as LinkProps<string> & {
      ref?: Ref<HTMLAnchorElement>;
    };
    return (
      <a
        href={href}
        {...linkRest}
        {...handlers}
        ref={ref}
        aria-disabled={disabled || undefined}
        onClick={disabled ? blockActivation : onClick}
        className={resolvedClassName}
        data-pressed={pressed || undefined}
      >
        {Icon ? <Icon className={styles.icon} /> : null}
        {children}
      </a>
    );
  }

  const {
    ref,
    type = 'button',
    children,
    onClick,
    disabled: _disabled,
    ...buttonRest
  } = rest as ButtonProps<string> & {
    ref?: Ref<HTMLButtonElement>;
  };
  return (
    <button
      {...buttonRest}
      {...handlers}
      ref={ref}
      type={type}
      aria-disabled={disabled || undefined}
      onClick={disabled ? blockActivation : onClick}
      className={resolvedClassName}
      data-pressed={pressed || undefined}
    >
      {Icon ? <Icon className={styles.icon} /> : null}
      {children}
    </button>
  );
}
