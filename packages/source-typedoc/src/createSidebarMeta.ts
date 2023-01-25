import { Plugin } from 'unified';
import * as hast from 'hast';
import * as unist from 'unist';
import { toText } from 'hast-util-to-text';
import { visit, CONTINUE, EXIT } from 'unist-util-visit';

export type SidebarResult = {
  href: string;
  className: string[];
  text: string;
};

export interface CreateSidebarOptions {
  resultCallback: (result: SidebarResult[]) => void;
}

const extractSidebar = (tree: unist.Node, resultCallback) => {
  const sidebarItems = [];

  visit(
    tree,
    (node: hast.Element) => {
      const element = node as hast.Element;
      const classNames = element?.properties?.className as string[];
      return classNames?.indexOf('tsd-navigation') >= 0 && classNames?.indexOf('secondary') >= 0;
    },
    (node: hast.Element) => {
      // Find all List elements
      visit(
        node,
        (childNode: hast.Element) => childNode.tagName === 'li',
        (childNode: hast.Element) => {
          const parentProps = childNode.properties;
          // Find all child anchor tags
          visit(
            childNode,
            (grandchildNode: hast.Element) => grandchildNode.tagName === 'a',
            (grandchildNode: hast.Element) => {
              const anchor = grandchildNode as hast.Element;
              const textLabel = toText(anchor, {
                whitespace: 'pre'
              });
              sidebarItems.push({ ...anchor.properties, parentProps, text: textLabel });
              return EXIT;
            }
          );
          return CONTINUE;
        }
      );
      return CONTINUE;
    }
  );
  resultCallback(sidebarItems);
};

const createSidebarMeta: Plugin<[CreateSidebarOptions?]> = (options?: CreateSidebarOptions) => {
  const { resultCallback } = options || {};
  return (tree: unist.Node) => {
    extractSidebar(tree, resultCallback);
  };
};

export default createSidebarMeta;
