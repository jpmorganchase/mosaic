import React from 'react';
export declare const MAX_LENGTH = 23;
export interface TileContentLabelProps {
  /** Additional class name for root class override */
  className?: string;
  labelItems?: string[];
  labelName?: string;
}
export declare const ContentLabel: React.FC<React.PropsWithChildren<TileContentLabelProps>>;
export declare const ContentLabelWithTooltip: React.FC<
  React.PropsWithChildren<TileContentLabelProps>
>;
export declare const TileContentLabel: React.FC<React.PropsWithChildren<TileContentLabelProps>>;
