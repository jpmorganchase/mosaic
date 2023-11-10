import React from 'react';
import { Size } from '../common/types';
export interface UnOrderedListProps extends Omit<React.HTMLProps<HTMLUListElement>, 'size'> {
  size?: Size;
  variant?: 'regular' | 'document' | 'image';
}
export declare const UnorderedList: React.FC<React.PropsWithChildren<UnOrderedListProps>>;
