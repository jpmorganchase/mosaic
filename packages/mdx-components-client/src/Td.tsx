import React from 'react';
import classnames from 'clsx';
import { td } from '@jpmorganchase/mosaic-theme';

export interface TdProps extends React.HTMLProps<HTMLTableCellElement> {}

export const Td: React.FC<React.PropsWithChildren<TdProps>> = ({ className, ...rest }) => (
  <td className={classnames(className, td())} {...rest} />
);
