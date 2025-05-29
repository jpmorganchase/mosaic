import React, { Children, cloneElement, ReactElement } from 'react';
import { GridLayout, GridItem } from '@salt-ds/core';
import { CardProps } from './Card';

export interface CardsProps {
  className?: string;
  children: ReactElement<CardProps>[];
}

function layoutChildren(children) {
  return Children.map(children, (child, index) => {
    return (
      <GridItem>
        {cloneElement(child, {
          key: `card-${index}`
        })}
      </GridItem>
    );
  });
}

export const Cards: React.FC<CardsProps> = ({ children, ...rest }) => (
  <GridLayout margin={0} style={{ gridAutoColumns: 'minmax(0, 1fr)' }} {...rest}>
    {layoutChildren(children)}
  </GridLayout>
);
