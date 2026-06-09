import React from 'react';
import { TBody as SaltTBody, type TBodyProps as SaltTBodyProps } from '@salt-ds/core';

/**
 * Markdown `<tbody>` renderer. Delegates to Salt's `<TBody>` so
 * it inherits the parent `<Table>`'s zebra/variant styling via
 * Salt's table context.
 */
export type TbodyProps = SaltTBodyProps;

export const Tbody: React.FC<React.PropsWithChildren<TbodyProps>> = props => (
  <SaltTBody {...props} />
);
