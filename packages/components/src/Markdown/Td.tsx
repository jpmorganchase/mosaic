import React from 'react';
import { TD as SaltTD, type TDProps as SaltTDProps } from '@salt-ds/core';

/**
 * Markdown `<td>` renderer. Delegates to Salt's `<TD>`. Salt's
 * `<TD>` spreads arbitrary props onto the underlying `<td>`, so
 * the `colSpan` / `rowSpan` attributes emitted by the editor's
 * merged-cell exporter pass through unchanged and render as
 * expected.
 */
export type TdProps = SaltTDProps;

export const Td: React.FC<React.PropsWithChildren<TdProps>> = props => <SaltTD {...props} />;
