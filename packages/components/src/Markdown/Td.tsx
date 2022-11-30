import React from 'react';
import classnames from 'classnames';
import { td } from '@jpmorganchase/mosaic-theme';

export interface TdProps extends React.HTMLProps<HTMLTableDataCellElement> {}

export const Td: React.FC<TdProps> = ({ className, ...rest }) => (
  <td className={classnames(className, td())} {...rest} />
);
