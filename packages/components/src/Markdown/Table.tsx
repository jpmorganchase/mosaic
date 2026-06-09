import React from 'react';
import {
  Table as SaltTable,
  TableContainer,
  type TableProps as SaltTableProps
} from '@salt-ds/core';

/**
 * Markdown `<table>` renderer.
 *
 * Delegates to Salt's `<Table>` (wrapped in Salt's `<TableContainer>`
 * for overflow handling) so authored markdown tables — both GFM
 * `| ... |` blocks and inline-JSX `<Table>` blocks emitted by the
 * editor's merged-cell exporter — pick up Salt's design tokens
 * automatically.
 *
 * Defaults differ from Salt's own defaults in one place: `zebra`
 * is `true` here. Long markdown tables are far easier to scan with
 * alternating row fills; consumers who want the un-zebra'd look
 * can still pass `zebra={false}` from MDX (`<Table zebra={false}>`).
 *
 * Container wrapping is unconditional: Salt's `TableContainer`
 * adds horizontal-overflow scrolling, which is what we need for
 * mobile breakpoints where a wide table would otherwise blow out
 * the page width.
 */
export type TableProps = SaltTableProps;

export const Table: React.FC<React.PropsWithChildren<TableProps>> = ({ zebra = true, ...rest }) => (
  <TableContainer>
    <SaltTable zebra={zebra} {...rest} />
  </TableContainer>
);
