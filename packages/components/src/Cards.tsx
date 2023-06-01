'use client';

import React, { Children, cloneElement, ReactElement } from 'react';

import { Grid } from './Grid';
import { CardProps } from './Card';

export interface CardsProps {
  className?: string;
  children: ReactElement<CardProps>[];
}

function layoutChildren(children) {
  return Children.map(children, (child, index) =>
    cloneElement(child, {
      key: `card-${index}`,
      // disable any default spacing added by withMarkdownSpacing
      spacing: 'none'
    })
  );
}

export const Cards: React.FC<CardsProps> = ({ children, ...rest }) => (
  <Grid size="medium" {...rest}>
    {layoutChildren(children)}
  </Grid>
);
