import React, { FC, ReactNode } from 'react';
import { Size } from '../common/types';
export declare type TileContentClassesType = {
  action?: string;
  description?: string;
  highlighted?: string;
  icon?: string;
  image?: string;
  root?: string;
  title?: string;
};
export interface TileContentProps {
  /** Description of the action that occurs upon click */
  action?: string | ReactNode;
  /** Caption */
  caption?: string | ReactNode;
  /** Classname override for tile content */
  classes?: TileContentClassesType;
  /** Additional class name for root class override */
  className?: string;
  /** Is tile disabled */
  disabled?: boolean;
  /** Description of the the content */
  description?: string | ReactNode;
  /** Image */
  image?: string | ReactNode;
  /** Placement of the image */
  imagePlacement?: 'left' | 'top' | 'fullWidth';
  /** Event fired when image url fails to load */
  onImageError?: React.DOMAttributes<HTMLImageElement>['onError'];
  /** Eyebrow of the the Tile */
  eyebrow?: string;
  /** Title of the the Tile */
  title?: string;
  /** Tile size */
  size?: Size | 'fitContent' | 'fullWidth';
}
export declare const TileContent: FC<React.PropsWithChildren<TileContentProps>>;
