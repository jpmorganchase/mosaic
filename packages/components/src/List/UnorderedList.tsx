import React from 'react';
import classnames from 'clsx';
import { unorderedList, unorderedListItem } from '@jpmorganchase/mosaic-theme';

import { Size } from '../common/types';
import { ListItemProps } from './ListItem';

export interface UnOrderedListProps extends Omit<React.HTMLProps<HTMLUListElement>, 'size'> {
  size?: Size;
  variant?: 'regular' | 'document' | 'image';
}

export const UnorderedList: React.FC<React.PropsWithChildren<UnOrderedListProps>> = ({
  children,
  className,
  size = 'small',
  variant = 'document',
  ...rest
}) => {
  const formattedChildren = React.Children.map(children, child => {
    if (!React.isValidElement(child)) {
      return child;
    }
    return React.cloneElement(child as React.ReactElement<ListItemProps>, {
      className: classnames(child.props.className, unorderedListItem({ size, variant })),
      size,
      variant
    });
  });
  return (
    <ul className={classnames(className, unorderedList({ size, variant }))} {...rest}>
      {formattedChildren}
    </ul>
  );
};
