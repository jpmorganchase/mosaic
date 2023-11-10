import React, { FC } from 'react';
import { TileBaseProps } from '../TileBase';
import { TileContentProps } from '../TileContent';
export interface TileButtonProps extends TileBaseProps, TileContentProps {}
export declare const TileButton: FC<React.PropsWithChildren<TileButtonProps>>;
