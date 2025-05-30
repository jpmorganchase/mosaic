import React, { Children, cloneElement, ReactElement } from 'react';
import { GridLayout, GridItem, GridLayoutProps } from '@salt-ds/core';
import { CardProps } from './Card';

export interface CardsProps extends GridLayoutProps<'div'> {
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

export const Cards: React.FC<CardsProps> = ({ children, columns = 4, ...rest }) => (
  <GridLayout style={{ margin: '0px', ...rest.style }} {...rest}>
    {layoutChildren(children)}
  </GridLayout>
);
