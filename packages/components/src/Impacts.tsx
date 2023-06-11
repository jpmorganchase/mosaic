'use client';
import React, { Children, cloneElement, ReactElement } from 'react';

import { Grid } from './Grid';
import { ImpactProps } from './Impact';

export interface ImpactsProps {
  className?: string;
  children: ReactElement<ImpactProps>[];
}

function layoutChildren(children) {
  return Children.map(children, (child, index) =>
    cloneElement(child, {
      key: `impact-${index}`,
      // disable any default spacing added by withMarkdownSpacing
      spacing: 'none'
    })
  );
}

export const Impacts: React.FC<ImpactsProps> = ({ children, ...rest }) => (
  <Grid size="large" {...rest}>
    {layoutChildren(children)}
  </Grid>
);
