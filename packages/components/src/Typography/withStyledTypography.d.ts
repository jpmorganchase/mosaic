import React from 'react';
import { TypographyProps } from './Typography';
export declare function withStyledTypography(
  variantClassName: string,
  Component?: React.ElementType,
  defaultProps?: Record<string, unknown>
): React.FC<React.PropsWithChildren<TypographyProps>>;
