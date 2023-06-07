import React from 'react';
import classnames from 'clsx';
import { tbody } from '@jpmorganchase/mosaic-theme';

export interface TbodyProps extends React.HTMLProps<HTMLTableSectionElement> {}

export const Tbody: React.FC<React.PropsWithChildren<TbodyProps>> = ({ className, ...rest }) => (
  <tbody className={classnames(className, tbody())} {...rest} />
);
