import React, { forwardRef, HTMLAttributes, ReactNode, Ref, useEffect } from 'react';
import { Portal, useWindow } from '@salt-ds/lab';
import classnames from 'classnames';

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
      <Window className={classnames(className, styles.root)} ref={forwardedRef} {...rest}>
        {children}
      </Window>
    </Portal>
  );
});
