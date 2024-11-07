import React from 'react';
import classnames from 'clsx';
import { tr } from '@jpmorganchase/mosaic-theme';

export interface TrProps extends React.HTMLProps<HTMLTableRowElement> {}

export const Tr: React.FC<React.PropsWithChildren<TrProps>> = ({ className, ...rest }) => (
  <tr className={classnames(className, tr())} {...rest} />
);
