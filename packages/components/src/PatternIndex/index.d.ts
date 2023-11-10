import React from 'react';
export declare type PatternItem = {
  a11yLevel: string;
  description: string;
  owner: string;
  title: string;
  link: string;
  source: 'FIGMA' | 'STORYBOOK';
};
export declare type PatternIndexProps = {
  /** Additional class name for root class override */
  className?: string;
  /** Number of items per page */
  itemsPerPage?: number;
  /** Data view */
  view: PatternItem[];
};
export declare type PatternRendererProps = {
  /** Tile item */
  item: PatternItem;
};
export declare const FigmaRenderer: ({ item }: { item: any }) => JSX.Element;
export declare const StorybookRenderer: ({ item }: { item: any }) => JSX.Element;
export declare const PatternIndex: React.FC<React.PropsWithChildren<PatternIndexProps>>;
