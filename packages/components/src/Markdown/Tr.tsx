import React from 'react';
import { TR as SaltTR, type TRProps as SaltTRProps } from '@salt-ds/core';

/**
 * Markdown `<tr>` renderer. Delegates to Salt's `<TR>`. Salt's
 * component is a thin `<tr>` wrapper that participates in the
 * surrounding Salt table context — required for zebra striping
 * and divider styling to render correctly on the row.
 */
export type TrProps = SaltTRProps;

export const Tr: React.FC<React.PropsWithChildren<TrProps>> = props => <SaltTR {...props} />;
