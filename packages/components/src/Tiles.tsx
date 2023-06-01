'use client';
import React, { FC, forwardRef, ReactElement, Ref } from 'react';

import { TileBaseProps } from './TileBase';
import { Grid, GridProps } from './Grid';

export interface TilesProps extends GridProps {
  /** Tiles */
  children?: ReactElement<TileBaseProps>[];
}

export const Tiles: FC<TilesProps> = forwardRef(
  ({ children, ...rest }, ref: Ref<HTMLDivElement>) => (
    <Grid {...rest} ref={ref}>
      {children}
    </Grid>
  )
);
