'use client';
import React, { forwardRef, Ref } from 'react';
import classnames from 'clsx';

import { LinkBase, LinkBaseProps } from '../LinkBase';
import { LinkText, LinkTextProps } from '../LinkText';
import styles from './styles.css';

export interface LinkProps extends LinkBaseProps, Omit<LinkTextProps, 'variant'> {
  LinkBaseProps?: LinkBaseProps;
  LinkTextProps?: LinkTextProps;
  /* Variant
   - `component` is a custom solution where you provide your own component that is wrapped by the link
   - `document` is a simple inline link text used by document content
   - `heading` is a simple inline link text used by document headings
   - `regular` is designed for link text for general use anywhere
   - `selectable` is designed for use in tabs and vertical navigation
   */
  variant?: 'component' | 'document' | 'heading' | 'regular' | 'selectable';
}

export const Link = forwardRef<HTMLLinkElement, LinkProps>((props, ref: Ref<HTMLLinkElement>) => {
  const {
    children,
    className,
    disabled,
    endIcon,
    hovered,
    link,
    href = link,
    LinkBaseProps: LinkBasePropsProp,
    LinkTextProps: LinkTextPropsProp,
    onClick,
    rel,
    startIcon,
    target,
    title,
    variant = 'regular',
    ...rest
  } = props;

  const linkTextProps = {
    children,
    disabled,
    endIcon,
    link,
    hovered,
    startIcon,
    ...LinkTextPropsProp
  };
  return (
    <LinkBase
      disabled={disabled}
      href={href}
      onClick={onClick}
      {...LinkBasePropsProp}
      className={classnames(
        styles.link,
        {
          [styles.inline]: variant === 'document',
          [styles.document]: variant === 'document',
          [styles.heading]: variant === 'heading',
          [styles.regular]: variant === 'regular',
          [styles.selectable]: variant === 'selectable'
        },
        LinkBasePropsProp?.className,
        className
      )}
      ref={ref}
      rel={rel}
      target={target}
      title={title}
      {...rest}
    >
      {variant === 'regular' || variant === 'document' ? (
        <LinkText variant={variant} {...linkTextProps}>
          {children}
        </LinkText>
      ) : (
        children
      )}
    </LinkBase>
  );
});
