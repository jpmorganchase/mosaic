import React from 'react';
import classnames from 'classnames';
import { tbody } from '@jpmorganchase/mosaic-theme';

export interface TbodyProps extends React.HTMLProps<HTMLTableSectionElement> {}

export const Tbody: React.FC<TbodyProps> = ({ className, ...rest }) => (
  <tbody className={classnames(className, tbody())} {...rest} />
);
