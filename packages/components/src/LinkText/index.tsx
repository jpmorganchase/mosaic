'use client';
import React, { forwardRef, isValidElement, ReactNode, Ref } from 'react';
import classnames from 'clsx';
import { Icon, IconProps } from '../Icon';

import styles from './styles.css';
import { hasProtocol } from '../utils/hasProtocol';

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type LinkIconProps = PartialBy<IconProps, 'name'>;

export interface LinkTextProps {
  /** Children */
  children?: React.ReactNode;
  /** Additional class name for root class override */
  className?: string;
  /** Disabled */
  disabled?: boolean;
  /* End Icon name */
  endIcon?: string;
  /* Additional End Icon Props */
  EndIconProps?: IconProps;
  /** hovered, used when the link's UI is controlled by another component's state */
  hovered?: boolean;
  /* Link URL */
  link?: string;
  /* Start Icon name */
  startIcon?: string;
  /* Additional Start Icon Props */
  StartIconProps?: IconProps;
  /* Variant
   - `regular` is designed for link text for use anywhere
   - `document` is a simpler link text used by documents
   */
  variant?: 'document' | 'regular';
}

function IconAdornment({ additionalProps, className, disabled, name = 'none' }) {
  if (name === 'none') {
    return null;
  }
  return (
    <Icon
      className={classnames(className, styles.icon, {
        [styles.disabled]: disabled
      })}
      name={name}
      {...additionalProps}
    />
  );
}

export const LinkText = forwardRef<HTMLSpanElement, LinkTextProps>(
  (props, ref: Ref<HTMLSpanElement>) => {
    const {
      children,
      className,
      disabled,
      endIcon,
      EndIconProps,
      hovered,
      link,
      startIcon = 'none',
      StartIconProps,
      variant = 'regular',
      ...rest
    } = props;
    const isInternal = !hasProtocol(link);

    // eslint-disable-next-line new-cap
    const startIconAdornment = IconAdornment({
      additionalProps: StartIconProps,
      disabled,
      name: startIcon,
      className: styles.icon
    });

    let defaultEndIconName;
    if (!isInternal) {
      defaultEndIconName = 'tearOut';
    } else {
      defaultEndIconName = variant === 'regular' ? 'chevronRight' : 'none';
    }

    const endIconName = endIcon || defaultEndIconName;
    // eslint-disable-next-line new-cap
    const endIconAdornment = IconAdornment({
      additionalProps: EndIconProps,
      disabled,
      name: endIconName,
      className: styles.icon
    });

    let enhancedChildren: ReactNode = null;
    const childrenClassName = classnames(className, styles.root, {
      [styles.document]: variant === 'document',
      [styles.regular]: variant === 'regular',
      [styles.disabled]: disabled
    });
    if (typeof children === 'string') {
      enhancedChildren = children;
    } else if (isValidElement(children)) {
      const child = React.Children.only(children) as React.ReactElement<{
        className: string;
        ref: Ref<HTMLSpanElement>;
      }>;
      enhancedChildren = React.cloneElement(child, {
        className: classnames(child.props.className, childrenClassName),
        ref
      });
    }
    return (
      <span className={classnames(className)} ref={ref} {...rest}>
        {startIconAdornment}
        <span className={childrenClassName} data-dp-hover={!disabled && hovered}>
          {enhancedChildren}
        </span>
        {endIconAdornment}
      </span>
    );
  }
);
