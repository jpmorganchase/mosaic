import { Plugin } from 'unified';
import * as hast from 'hast';
import * as unist from 'unist';
import { remove } from 'unist-util-remove';
import { Test } from 'unist-util-visit';

const isDoc = element => element.type === 'doctype';
const isUnwantedTag = element =>
  element ? element && ['head', 'script', 'style'].indexOf(element.tagName) >= 0 : false;
const isUnwantedElement = element => {
  const className = element ? (element.properties?.className as string) : undefined;
  return (
    className &&
    (className.indexOf('tsd-breadcrumb') >= 0 ||
      className.indexOf('tsd-page-toolbar') >= 0 ||
      className.indexOf('tsd-generator') >= 0 ||
      className.indexOf('col-menu') >= 0 ||
      className.indexOf('overlay') >= 0)
  );
};
const isUnwantedSVG = element => {
  const className = element ? (element.properties?.className as string) : undefined;
  return element?.tagName === 'svg' && className && className.indexOf('icon-tabler-link') >= 0;
};
const isDtExample = element =>
  element?.tagName === 'dt' && element?.children?.[0].value === 'example';

const removeUnused = (tree: unist.Node) => {
  const test: Test = node => {
    const elementNode = node.type === 'element' ? (node as hast.Element) : undefined;
    return (
      elementNode &&
      (isDoc(elementNode) ||
        isUnwantedTag(elementNode) ||
        isUnwantedElement(elementNode) ||
        isDtExample(elementNode) ||
        isUnwantedSVG(elementNode))
    );
  };
  remove(tree, test);
};

/* Remove unused navigation and layout elements, we will replace by our own layouts */
const removeUnusedElements: Plugin = () => (tree: unist.Node) => removeUnused(tree);

export default removeUnusedElements;
