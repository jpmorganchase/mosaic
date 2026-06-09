import React from 'react';
import { TH as SaltTH, type THProps as SaltTHProps } from '@salt-ds/core';

/**
 * Markdown `<th>` renderer. Delegates to Salt's `<TH>` so header
 * cells pick up the Salt header typography + divider treatment
 * from the surrounding `<THead>` / `<Table>` context.
 */
export type ThProps = SaltTHProps;

export const Th: React.FC<React.PropsWithChildren<ThProps>> = props => <SaltTH {...props} />;
