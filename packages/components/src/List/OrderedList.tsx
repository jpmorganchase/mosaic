import React from 'react';
import classnames from 'clsx';
import { orderedList, orderedListItem } from '@jpmorganchase/mosaic-theme';

import { ListItemProps } from './ListItem';

export interface OrderedListProps extends Omit<React.HTMLProps<HTMLUListElement>, 'size'> {}

export const OrderedList: React.FC<React.PropsWithChildren<OrderedListProps>> = ({
  children,
  className
}) => {
  const formattedChildren = React.Children.map(children, child => {
    if (!React.isValidElement(child)) {
      return child;
    }
    return React.cloneElement(child as React.ReactElement<ListItemProps>, {
      className: classnames(child.props.className, orderedListItem)
    });
  });
  return <ol className={classnames(className, orderedList)}>{formattedChildren}</ol>;
};
