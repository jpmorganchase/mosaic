import { visit, CONTINUE, EXIT, SKIP } from 'unist-util-visit';
import { toText } from 'hast-util-to-text';
const replaceRoot = (tree, className) => {
  const test = node => node.type === 'element' && node.tagName === 'html';
  const visitor = node => {
    node.tagName = 'div';
    node.properties = { className: ['typedoc', className] };
    return EXIT;
  };
  visit(tree, test, visitor);
};
const reparentFooter = tree => {
  const test = node => {
    const classNames = node?.properties?.className;
    return !!(classNames?.indexOf('tsd-legend-group') >= 0);
  };
  const visitor = node => {
    visit(
      tree,
      footer => footer.tagName === 'footer',
      footer => {
        const footerChildren = [
          {
            type: 'element',
            tagName: 'h3',
            properties: {},
            children: [
              {
                type: 'text',
                value: 'Legends'
              }
            ]
          },
          node
        ];
        footer.children = footerChildren;
        return EXIT;
      }
    );
    return EXIT;
  };
  visit(tree, test, visitor);
};
const reparentBody = tree => {
  const test = node => node.type === 'element' && node.tagName === 'body';
  const visitor = (node, index, parent) => {
    if (!parent || index === null) {
      return EXIT;
    }
    parent.children.splice(index, 1, ...node?.children);
    return EXIT;
  };
  visit(tree, test, visitor);
};
const removePermalinks = tree => {
  const test = node => {
    const element = node;
    if (!element) {
      return false;
    }
    return (
      element.type === 'element' &&
      element.tagName === 'a' &&
      element?.properties?.ariaLabel === 'Permalink'
    );
  };
  const visitor = (node, index, parent) => {
    const element = node;
    if (!element || !parent || index === null) {
      return SKIP;
    }
    parent.children.splice(index, 1, ...node?.children);
    return [SKIP, index];
  };
  visit(tree, test, visitor);
};
const reassignHeadingIds = tree => {
  const test = node => {
    const element = node;
    if (!element) {
      return false;
    }
    return (
      element.type === 'element' && element.tagName === 'a' && element?.properties?.id !== undefined
    );
  };
  const visitor = (node, index, parent) => {
    const element = node;
    if (!element || !parent || index === null) {
      return SKIP;
    }
    const elementChildren = element.children || [];
    const hasChildHeading = elementChildren.some(child => {
      const childElement = child;
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].indexOf(childElement?.tagName) >= 0) {
        childElement.properties = childElement.properties || {};
        const id =
          childElement.properties.id !== undefined
            ? childElement.properties.id
            : element.properties.id;
        childElement.properties.id = id;
        return true;
      }
      return false;
    });
    if (hasChildHeading) {
      parent.children.splice(index, 1, ...node?.children);
    }
    return CONTINUE;
  };
  visit(tree, test, visitor);
};
const parseHref = href => {
  const hrefAnchorMatches = href.split('#');
  const hrefAnchor = hrefAnchorMatches.length > 1 ? hrefAnchorMatches[1] : '';
  const hrefPath = hrefAnchorMatches.length > 1 ? hrefAnchorMatches[0] : href;
  // Extract the relative path so we can match against the page path
  let hrefPathBase = hrefPath.replace(/(.*)[/\\]/, '');
  let hrefPathRelative = hrefPath.replace(new RegExp(`/${hrefPathBase}$`), '');
  hrefPathBase = hrefPathBase === 'index' ? '' : hrefPathBase;
  hrefPathRelative = hrefPathBase === hrefPathRelative ? '' : hrefPathRelative;
  return {
    hrefAnchor,
    hrefPathBase,
    hrefPath,
    hrefPathRelative
  };
};
const fixLinks = (tree, contentRoot, pagePath) => {
  const test = node => {
    const element = node;
    const href = element?.properties?.href;
    return !!(node.tagName === 'a' && href?.indexOf('://') === -1);
  };
  // eslint-disable-next-line complexity
  const visitor = node => {
    const element = node;
    let href = element.properties?.href;
    if (!href) {
      return SKIP;
    }
    // Extract the relative page path from the contentRoot, the path below <version>
    // <contentRootPath>/<version>/relative/page/path
    const normalizedPagePath = pagePath.replace(/\.html/, '');
    const pagePathBase = normalizedPagePath.replace(/(.*)[/\\]/, '');
    const pagePathRelative = normalizedPagePath.replace(`${contentRoot}/`, '');
    const isPageRootIndex = pagePathRelative === 'index' && pagePathBase === 'index';
    // Typedocs generates modules.html at the root level but we move it to <version>/modules
    // If we are pre-processing modules/index.html and we have a link to ourself (modules.html)
    // we can just use a local page anchor
    if (pagePathRelative.indexOf('modules/') === 0 && /^(?:\.[/\\])?modules.html/.test(href)) {
      href = href.replace('modules.html', '');
    }
    href = href.replace('.html', '');
    // If the href is a relative path, then leave it as-is
    if (href.indexOf('.') === 0) {
      element.properties = element.properties || {};
      element.properties.href = href;
      return CONTINUE;
    }
    // Split the path and the anchor from href
    const { hrefAnchor, hrefPathBase, hrefPath, hrefPathRelative } = parseHref(href);
    // Depending on what doc we are processing and where we are linking to, we need to create a relative path
    const isCurrentDirectory = !hrefPathRelative;
    const isCurrentPageAnchor =
      (isCurrentDirectory && hrefPathBase === pagePathBase) || (!hrefPath && hrefAnchor);
    const isIndexInCurrentDirectory =
      isCurrentDirectory &&
      pagePathBase === 'index' &&
      pagePathRelative === `${hrefPathBase}/index`;
    if (isCurrentPageAnchor || isIndexInCurrentDirectory) {
      // the linked content is in the current pagePath or an explicit local anchor
      href = `#${hrefAnchor}`;
    } else if (isPageRootIndex || isCurrentDirectory) {
      // the linked content is in the current directory or top level
      href = `./${href}`;
    } else {
      // the linked content is linked from the root directory
      href = `../${href}`;
    }
    element.properties = element.properties || {};
    element.properties.href = href;
    return CONTINUE;
  };
  visit(tree, test, visitor);
};
const createCodeBlocks = tree => {
  const test = (node, _index, parent) => node.tagName === 'code' && parent?.tagName === 'pre';
  const visitor = (node, index, parent) => {
    if (index === null || !parent) {
      return SKIP;
    }
    const element = node;
    const code = element.children
      .map(nodeItem => {
        if (nodeItem.tagName === 'br') {
          return '<br>';
        }
        if (typeof nodeItem.value === 'string' && nodeItem.value.startsWith('\n')) {
          return nodeItem.value.replace(/\n/g, '<br>');
        }
        return toText(nodeItem, {
          whitespace: 'pre'
        });
      })
      .join('');
    parent.children.splice(index, 1, {
      type: 'text',
      value: code
    });
    return [SKIP, index];
  };
  visit(tree, test, visitor);
};
const replaceAnchorsWithLinks = tree => {
  const test = node => {
    const element = node;
    const classNames = element?.properties?.className;
    return !(
      node.tagName === 'a' && !!classNames?.some(className => className?.indexOf('tsd') === 0)
    );
  };
  const visitor = node => {
    node.type === 'mdxJsxTextElement';
    node.name = 'Link';
    return CONTINUE;
  };
  visit(tree, test, visitor);
};
const styleListItems = tree => {
  const test = node => node.tagName === 'ul';
  const visitor = node => {
    const element = node;
    const classNames = element?.properties?.className;
    const listElement = element?.children.find(child => child.tagName === 'li');
    const childClassNames = listElement ? listElement?.properties?.className : undefined;
    const isTypedocElement = classNames?.some(
      className => ['tsd-index-list', 'tsd-legend', 'tsd-descriptions'].indexOf(className) !== -1
    );
    const hasTypedocListChildren =
      !isTypedocElement &&
      childClassNames?.some(
        className => ['tsd-kind-enum-member', 'tsd-parameter-signature'].indexOf(className) >= 0
      );
    node.properties = {
      ...element.properties,
      variant: isTypedocElement || hasTypedocListChildren ? 'blank' : 'document'
    };
    return CONTINUE;
  };
  visit(tree, test, visitor);
};
const preprocessTree = options => {
  const { className, contentRoot, pagePath } = options || {};
  if (!pagePath) {
    return;
  }
  return tree => {
    /* Replace HTML element with a div */
    replaceRoot(tree, className);
    /* Re-parent legends to new footer */
    reparentFooter(tree);
    /* Remove body element and re-parent content to the element above */
    reparentBody(tree);
    /* Reassign the heading anchor ids to heading */
    reassignHeadingIds(tree);
    /* Remove Heading Permalinks */
    removePermalinks(tree);
    /** Fix Link hrefs - remove TsDoc "modules" references */
    fixLinks(tree, contentRoot, pagePath);
    /** Recreate Pre code blocks */
    createCodeBlocks(tree);
    /* Style List items */
    styleListItems(tree);
    /* Replace anchor tags with Link components */
    replaceAnchorsWithLinks(tree);
  };
};
export default preprocessTree;
