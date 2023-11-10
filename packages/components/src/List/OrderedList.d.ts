import React from 'react';
export interface OrderedListProps extends Omit<React.HTMLProps<HTMLUListElement>, 'size'> {}
export declare const OrderedList: React.FC<React.PropsWithChildren<OrderedListProps>>;
