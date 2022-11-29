import React, { FC } from 'react';
import classnames from 'classnames';
import { Button as UITKButton, ButtonProps as UITKButtonProps } from '@jpmorganchase/uitk-core';
import { button as buttonStyles } from '@jpmorganchase/mosaic-theme';

import { LinkButton } from './LinkButton';
import type { LinkButtonProps } from './LinkButton';

export interface ButtonProps extends UITKButtonProps {}

export const Button: FC<LinkButtonProps | ButtonProps> = ({
  children,
  className,
  variant,
  ...rest
}) => {
  let Component = UITKButton;
  if (rest?.href) {
    Component = LinkButton;
  }
  return (
    <Component className={classnames(buttonStyles({ variant }), className)} {...rest}>
      {children}
    </Component>
  );
};
