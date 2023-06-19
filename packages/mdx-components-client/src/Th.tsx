import React from 'react';
import classnames from 'clsx';
import { th } from '@jpmorganchase/mosaic-theme';

export interface ThProps extends React.HTMLProps<HTMLTableCellElement> {}

export const Th: React.FC<React.PropsWithChildren<ThProps>> = ({ className, ...rest }) => (
  <th className={classnames(className, th())} {...rest} />
);
