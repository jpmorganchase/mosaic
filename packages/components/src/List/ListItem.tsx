import React from 'react';

import { UnOrderedListProps } from './UnorderedList';
import { Size } from '../common/types';

export interface ListItemProps extends Omit<React.HTMLProps<HTMLLIElement>, 'checked' | 'size'> {
  checked?: boolean | null;
  size?: Size;
  variant?: 'regular' | 'document' | 'image';
}

export const ListItem: React.FC<React.PropsWithChildren<ListItemProps>> = ({
  children,
  size = 'small',
  variant = 'document',
  ...rest
}) => {
  const formattedText = React.Children.map(children, child => {
    if (!React.isValidElement(child)) {
      return child;
    }
    if (child.props.mdxType === 'ul') {
      return React.cloneElement(child as React.ReactElement<UnOrderedListProps>, {
        size,
        variant
      });
    }
    return child;
  });
  return <li {...rest}>{formattedText}</li>;
};
