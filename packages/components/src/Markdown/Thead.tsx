import React from 'react';
import classnames from 'classnames';
import { thead } from '@jpmorganchase/mosaic-theme';

export interface TheadProps extends React.HTMLProps<HTMLTableSectionElement> {}

export const Thead: React.FC<TheadProps> = ({ className, ...rest }) => (
  <thead className={classnames(className, thead())} {...rest} />
);
