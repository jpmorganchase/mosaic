import React, { forwardRef, Ref } from 'react';
import classnames from 'clsx';
import { ToolbarButton, ToolbarButtonProps } from '@salt-ds/lab';

import styles from './TextFormatToolbarButton.css';

interface TextFormatToolbarButtonProps extends ToolbarButtonProps {
  active: boolean;
}

export const TextFormatToolbarButton = forwardRef(
  (
    { active, className, onClick, children, ...rest }: TextFormatToolbarButtonProps,
    ref: Ref<HTMLButtonElement>
  ) => (
    <ToolbarButton
      ref={ref}
      onClick={onClick}
      // TODO remove once Salt ToolbarButton supports className overrides
      style={{ width: 28, height: 28, lineHeight: 'normal' }}
      className={classnames(className, styles.root, {
        [styles.active]: active
      })}
      {...rest}
    >
      {children}
    </ToolbarButton>
  )
);
