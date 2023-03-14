import React from 'react';
import classnames from 'clsx';
import { table, tableContainer } from '@jpmorganchase/mosaic-theme';

export interface TableProps extends React.HTMLProps<HTMLTableElement> {}

export const Table: React.FC<React.PropsWithChildren<TableProps>> = ({ className, ...rest }) => (
  <div className={classnames(className, tableContainer())}>
    <table className={table()} {...rest} />
  </div>
);
