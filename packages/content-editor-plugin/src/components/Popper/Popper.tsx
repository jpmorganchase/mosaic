import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { Portal, useWindow } from '@salt-ds/lab';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import classnames from 'clsx';

import styles from './Popper.css';

interface PopperProps extends HTMLAttributes<HTMLDivElement> {
  /** Floating contents */
  children?: ReactNode;
  /** Class name */
  className?: string;
  /** Flag indicating whether the floating content is visible */
  open?: boolean;
}

export const Popper = forwardRef<HTMLDivElement, PopperProps>(function Popper(props, forwardedRef) {
  const { children, className, ...rest } = props;
  const Window = useWindow();

  if (!rest.open) {
    return null;
  }

  return (
    <Portal>
      <Window
        className={classnames(className, themeClassName, styles.root)}
        ref={forwardedRef}
        {...rest}
      >
        {children}
      </Window>
    </Portal>
  );
});
