'use client';
import React, { ReactElement, Ref } from 'react';
import type { Column, PluginHook } from 'react-table';
import classnames from 'clsx';
import {
  table as tableRecipe,
  tbody as tbodyRecipe,
  td as tdRecipe,
  th as thRecipe,
  thead as theadRecipe,
  tr as trRecipe
} from '@jpmorganchase/mosaic-theme';

import { IsomorphicSuspense } from './IsomorphicSuspense';

function TableHead({ headerGroups }) {
  return (
    <thead className={theadRecipe()}>
      {headerGroups.map((headerGroup, groupIndex) => (
        <tr
          className={trRecipe()}
          key={`headGroup${groupIndex}`}
          {...headerGroup.getHeaderGroupProps()}
        >
          {headerGroup.headers.map((column, columnIndex) => (
            <th
              className={thRecipe()}
              key={`headColumn${columnIndex}`}
              {...column.getHeaderProps()}
            >
              {column.render('Header')}
            </th>
          ))}
        </tr>
      ))}
    </thead>
  );
}

function TableBody({ getTableBodyProps, prepareRow, rows }) {
  return (
    <tbody className={tbodyRecipe()} {...getTableBodyProps()}>
      {rows.map((row, rowIndex) => {
        prepareRow(row);
        return (
          <tr className={trRecipe()} key={`bodyRow${rowIndex}`} {...row.getRowProps()}>
            {row.cells.map((cell, cellIndex) => (
              <td className={tdRecipe()} key={`bodyCell${cellIndex}`} {...cell.getCellProps()}>
                {cell.render('Cell')}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
}

export interface DataTableProps<RowData extends Record<string, unknown>> {
  /** Additional class name for root class override */
  className?: string;
  /** Column specs (refer to react-table API) */
  columns: Column<RowData>[];
  /** Data model (refer to react-table API) */
  data: Array<RowData>;
  /** Ref */
  ref?: Ref<HTMLDivElement>;
  /** If false, column headers will be hidden */
  showColumnHeaders?: boolean;
  /** Collection of react-table plugin hooks to be applied to the table (refer to react-table API) */
  plugins?: PluginHook<RowData>[];
}

const LazyTable = React.lazy(() =>
  import('react-table').then(({ useTable }) => ({
    default: React.forwardRef(
      ({ className, columns, data, plugins, showColumnHeaders }, ref: Ref<HTMLTableElement>) => {
        const { getTableProps, getTableBodyProps, headerGroups, prepareRow, rows } = useTable(
          {
            columns,
            data
          },
          ...plugins
        );

        return (
          <table className={classnames(className, tableRecipe())} {...getTableProps()} ref={ref}>
            {showColumnHeaders ? <TableHead headerGroups={headerGroups} /> : null}
            <TableBody getTableBodyProps={getTableBodyProps} prepareRow={prepareRow} rows={rows} />
          </table>
        );
      }
    )
  }))
);

const ForwardRefTable = <T extends Record<string, unknown>>(
  { className, columns, data, showColumnHeaders = true, plugins = [] }: DataTableProps<T>,
  ref: Ref<HTMLTableElement>
) => (
  <IsomorphicSuspense fallback={<span>Loading table...</span>}>
    <LazyTable
      className={className}
      columns={columns}
      data={data}
      plugins={plugins}
      ref={ref}
      showColumnHeaders={showColumnHeaders}
    />
  </IsomorphicSuspense>
);

export const DataTable = React.forwardRef(ForwardRefTable) as <T extends Record<string, unknown>>(
  p: DataTableProps<T> & { ref?: Ref<HTMLTableElement> }
) => ReactElement;
