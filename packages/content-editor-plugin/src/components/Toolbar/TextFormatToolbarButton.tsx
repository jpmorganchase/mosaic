import React, { forwardRef, Ref } from 'react';
import classnames from 'clsx';
import { ToolbarButton, ToolbarButtonProps } from '@salt-ds/lab';

import styles from './TextFormatToolbarButton.css';

interface TextFormatToolbarButtonProps extends ToolbarButtonProps {
  active: boolean;
}

export const TextFormatToolbarButton = forwardRef(function TextFormatToolbarButton(
  { active, className, onClick, children, ...rest }: TextFormatToolbarButtonProps,
  ref: Ref<HTMLButtonElement>
) {
  return (
    <ToolbarButton
      ref={ref}
      onClick={onClick}
      // TODO remove once Salt ToolbarButton supports className overrides
      style={{ width: 28, height: 28 }}
      className={classnames(className, styles.root, {
        [styles.active]: active
      })}
      {...rest}
    >
      {children}
    </ToolbarButton>
  );
});
