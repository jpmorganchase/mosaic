import React, { ReactElement, Ref } from 'react';
import type { Column, PluginHook } from 'react-table';
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
export declare const DataTable: <T extends Record<string, unknown>>(
  p: DataTableProps<T> & {
    ref?: React.Ref<HTMLTableElement> | undefined;
  }
) => ReactElement;
