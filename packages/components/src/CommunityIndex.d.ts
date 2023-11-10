import React from 'react';
export declare type IndexItem = {
  action?: string;
  description?: string;
  eyebrow?: string;
  image?: string;
  group?: string;
  link: string;
  publicationDate: string;
  formattedDescription?: string;
  title?: string;
};
export declare type DefaultFilterViewRenderer = (
  /** Tile item */
  item: IndexItem,
  /** Tile item index in view */
  itemIndex: number
) => JSX.Element;
export declare type CommunityIndexProps = {
  /** Additional class name for root class override */
  className?: string;
  /** Data view */
  view: IndexItem[];
  /** Item Renderer */
  ItemRenderer: DefaultFilterViewRenderer;
};
export declare const ComunityIndexRenderer: DefaultFilterViewRenderer;
export declare const CommunityIndex: React.FC<React.PropsWithChildren<CommunityIndexProps>>;
