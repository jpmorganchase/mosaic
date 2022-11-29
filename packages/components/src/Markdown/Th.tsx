import React from 'react';
import classnames from 'classnames';
import { th } from '@jpmorganchase/mosaic-theme';

export interface ThProps extends React.HTMLProps<HTMLTableHeaderCellElement> {}

export const Th: React.FC<ThProps> = ({ className, ...rest }) => (
  <th className={classnames(className, th())} {...rest} />
);
