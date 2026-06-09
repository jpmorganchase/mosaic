import React from 'react';
import { THead as SaltTHead, type THeadProps as SaltTHeadProps } from '@salt-ds/core';

/**
 * Markdown `<thead>` renderer. Delegates to Salt's `<THead>` so
 * the section picks up the Salt table context (divider variant,
 * sticky behaviour) from the parent `<Table>`.
 */
export type TheadProps = SaltTHeadProps;

export const Thead: React.FC<React.PropsWithChildren<TheadProps>> = props => (
  <SaltTHead {...props} />
);
