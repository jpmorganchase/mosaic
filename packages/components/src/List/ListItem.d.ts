import React from 'react';
import { Size } from '../common/types';
export interface ListItemProps extends Omit<React.HTMLProps<HTMLLIElement>, 'checked' | 'size'> {
  checked?: boolean | null;
  size?: Size;
  variant?: 'regular' | 'document' | 'image';
}
export declare const ListItem: React.FC<React.PropsWithChildren<ListItemProps>>;
