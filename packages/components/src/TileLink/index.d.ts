import React, { FC } from 'react';
import { TileBaseProps } from '../TileBase';
import { TileContentProps } from '../TileContent';
export interface TileLinkProps extends TileBaseProps, TileContentProps {
  /** Link href */
  link?: string;
}
export declare const TileLink: FC<React.PropsWithChildren<TileLinkProps>>;
