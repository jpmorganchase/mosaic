import React, { FC, Ref } from 'react';
import { Size } from '../common/types';
export interface TileBaseProps {
  /** Does the tile have an always-visible border? */
  border?: boolean;
  /** Additional class name for root class override */
  className?: string;
  /** Is tile disabled */
  disabled?: boolean;
  /** Blur Handler */
  onBlur?: React.FocusEventHandler<HTMLDivElement>;
  /** Focus Handler */
  onFocus?: React.FocusEventHandler<HTMLDivElement>;
  /** Mouse Down Handler */
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  /** Mouse Out Handler */
  onMouseOut?: React.MouseEventHandler<HTMLDivElement>;
  /** Mouse Over Handler */
  onMouseOver?: React.MouseEventHandler<HTMLDivElement>;
  /** Mouse Up Handler */
  onMouseUp?: React.MouseEventHandler<HTMLDivElement>;
  /** Callback called when either the mouse is clicked or the enter key pressed */
  onSelect?: (event: React.KeyboardEvent | React.MouseEvent) => void;
  /** The children components of the Tile component */
  children?: React.ReactNode;
  /** Ref */
  ref?: Ref<HTMLDivElement>;
  /** aria role */
  role?: string;
  /** Tile size */
  size?: Size | 'fitContent' | 'fullWidth';
  /** tabIndex */
  tabIndex?: number;
  /** Variant */
  variant?: 'regular' | 'grid';
}
export interface TileBaseComponentProps extends TileBaseProps {
  /** Ref */
  tileRef?: Ref<HTMLDivElement>;
}
export declare const TileBaseComponent: FC<TileBaseComponentProps>;
export declare const TileBase: FC<TileBaseProps>;
