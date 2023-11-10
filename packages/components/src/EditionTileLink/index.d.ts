import React, { ReactNode } from 'react';
export declare type EditionTileLinkProps = {
  /** Additional class name for root class override */
  className?: string;
  /** Link description  */
  description?: ReactNode;
  /** Eyebrow text describing the content type */
  eyebrow?: string;
  /** Image associated with edition */
  image?: string;
  /** Placement of the image */
  imagePlacement?: 'left' | 'fullWidth';
  /** Link href */
  link: string;
  /** Edition title */
  title?: string;
};
export declare const EditionTileLink: React.FC<React.PropsWithChildren<EditionTileLinkProps>>;
