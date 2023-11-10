import React from 'react';
export declare const createCustomFilter: (view: any, filters: any) => any;
export declare const createFiltersList: (items: any) => any;
export declare type Edition = {
  eyebrow?: string;
  image?: string;
  group?: string;
  link: string;
  publicationDate: string;
  formattedDescription?: string;
  title?: string;
};
export declare type EditionFilterViewRenderer = (
  /** Edition data item */
  item: Edition,
  /** Edition item index in view */
  itemIndex: number
) => JSX.Element;
export declare type EditionFilterViewProps = {
  /** Additional class name for root class override */
  className?: string;
  /** Data view of editions */
  view: Edition[];
  /** Item Renderer */
  ItemRenderer: EditionFilterViewRenderer;
};
export declare const DefaultEditionFilterViewRenderer: EditionFilterViewRenderer;
export declare const EditionFilterView: React.FC<React.PropsWithChildren<EditionFilterViewProps>>;
