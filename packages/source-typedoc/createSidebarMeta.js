import { toText } from 'hast-util-to-text';
import { visit, CONTINUE, EXIT } from 'unist-util-visit';
const extractSidebar = (tree, resultCallback) => {
  const sidebarItems = [];
  visit(
    tree,
    node => {
      const element = node;
      const classNames = element?.properties?.className;
      return classNames?.indexOf('tsd-navigation') >= 0 && classNames?.indexOf('secondary') >= 0;
    },
    node => {
      // Find all List elements
      visit(
        node,
        childNode => childNode.tagName === 'li',
        childNode => {
          const parentProps = childNode.properties;
          // Find all child anchor tags
          visit(
            childNode,
            grandchildNode => grandchildNode.tagName === 'a',
            grandchildNode => {
              const anchor = grandchildNode;
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
const createSidebarMeta = options => {
  const { resultCallback } = options || {};
  return tree => {
    extractSidebar(tree, resultCallback);
  };
};
export default createSidebarMeta;
