import React from 'react';
import type { FC, ReactNode } from 'react';
export interface TypographyProps {
  children: ReactNode;
  /** Additional class name for root class override */
  className?: string;
  /** Root element type */
  component?: React.ElementType;
  /** Component id */
  id?: string;
  /** role */
  role?: string;
}
export declare const Typography: FC<TypographyProps>;
