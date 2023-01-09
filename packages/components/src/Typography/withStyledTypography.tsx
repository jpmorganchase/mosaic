import React from 'react';
import classnames from 'classnames';
import hoistNonReactStatics from 'hoist-non-react-statics';

import { Typography, TypographyProps } from './Typography';

export function withStyledTypography(
  variantClassName: string,
  Component: React.ElementType = 'p',
  defaultProps: Record<string, unknown> = {}
): React.FC<React.PropsWithChildren<TypographyProps>> {
  const StyledTypography: React.FC<React.PropsWithChildren<TypographyProps>> = ({
    className,
    ...rest
  }) => (
    <Typography
      className={classnames(variantClassName, className)}
      component={Component}
      {...defaultProps}
      {...rest}
    />
  );
  hoistNonReactStatics(StyledTypography, Typography);
  return StyledTypography;
}
