import { FC, ReactElement } from 'react';
import { TileBaseProps } from './TileBase';
import { GridProps } from './Grid';
export interface TilesProps extends GridProps {
  /** Tiles */
  children?: ReactElement<TileBaseProps>[];
}
export declare const Tiles: FC<TilesProps>;
