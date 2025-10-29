import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import classnames from 'clsx';

import styles from './Popper.css';
import { useFloatingComponent } from '@salt-ds/core';

interface PopperProps extends HTMLAttributes<HTMLDivElement> {
  /** Floating contents */
  children?: ReactNode;
  /** Class name */
  className?: string;
  /** Flag indicating whether the floating content is visible */
  open: boolean;
}

export const Popper = forwardRef<HTMLDivElement, PopperProps>(function Popper(props, forwardedRef) {
  const { children, className, ...rest } = props;

  const { Component: FloatingComponent } = useFloatingComponent();

  return (
    <FloatingComponent ref={forwardedRef} {...rest}>
      <div className={classnames(className, themeClassName, styles.root)}>{children}</div>
    </FloatingComponent>
  );
});
