import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

import React, { createElement } from 'react';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeReact, { Options } from 'rehype-react';
import { default as reactElementToJSXStringEntry } from 'react-element-to-jsx-string';
import type { PageDescriptor } from '@jpmorganchase/mosaic-types';

import createSidebarMeta from './createSidebarMeta';
import preprocessTree from './preprocessTree';
import removeUnusedElements from './removeUnusedElements';

const createLinkElement = (
  name: string,
  { href, ...rest }: { href: string },
  children: React.ReactNode
) => {
  // Keep anchors for local anchors on current page
  if (!href) {
    return createElement('a', { ...rest, href }, children);
  }
  return createElement(name, { ...rest, link: href, variant: 'component' }, children);
};

const reactElementToJSXString =
  // eslint-disable-next-line dot-notation
  reactElementToJSXStringEntry && reactElementToJSXStringEntry['__esModule']
    ? // eslint-disable-next-line dot-notation
      reactElementToJSXStringEntry['default']
    : reactElementToJSXStringEntry;

const htmlTagToReactName = {
  h1: 'H1',
  h2: 'H2',
  h3: 'H3',
  h4: 'H4',
  h5: 'H5',
  h6: 'H6',
  p: 'P2',
  ol: 'OrderedList',
  ul: 'UnorderedList',
  pre: 'Pre',
  table: 'Table',
  tbody: 'Tbody',
  thead: 'Thead',
  th: 'Th',
  td: 'Td',
  tr: 'Tr'
};

const createContent = async (
  contentRoot: string,
  pagePath: string,
  route: string,
  className: string
): Page => {
  if (!fs.existsSync(pagePath)) {
    console.warn(`${pagePath} not found.`);
    return null;
  }
  const data = await fsPromises.readFile(pagePath);
  if (data.length === 0) {
    return null;
  }

  const options: Options = {
    createElement: function createElementFactory(
      name: string,
      props,
      children: React.ReactNode
    ): React.ReactElement {
      if (name === 'a') {
        return createLinkElement('Link', props, children);
      }
      if (name === 'pre' && Array.isArray(children)) {
        return createElement('Pre', { ...props, code: children[0], language: 'tsx' }, []);
      }
      if (Object.hasOwnProperty.call(htmlTagToReactName, name)) {
        const reactName = name as keyof typeof htmlTagToReactName;
        return createElement(htmlTagToReactName[reactName], props, children);
      }
      return createElement(name, props, children);
    }
  };

  const sourcePage = data.toString();
  let sidebarNavOptions;
  const content = await unified()
    .use(rehypeParse)
    .use(preprocessTree, { className, contentRoot, pagePath })
    .use(createSidebarMeta, {
      resultCallback: function resultCallback(result) {
        sidebarNavOptions = result;
      }
    })
    .use(rehypeReact, options)
    .use(removeUnusedElements)
    .process(sourcePage);

  let formattedContent = reactElementToJSXString(content.result, {
    maxInlineAttributesLineLength: Infinity
  });

  /** Remove all newlines to avoid them being replaced with a paragraph by MDX2 */
  formattedContent = formattedContent.replace(/[\n]+\s*/g, ' ');

  /** Remove spaces that have been added to children */
  formattedContent = formattedContent.replace(/> /g, '>');
  formattedContent = formattedContent.replace(/ </g, '<');
  const routeBasename = path.posix.basename(route, '.mdx');
  return {
    content: formattedContent,
    meta: {
      layout: 'TypeDoc',
      sidebar: { exclude: true },
      data: {
        link:
          routeBasename === 'index'
            ? path.posix.dirname(route)
            : `${path.posix.dirname(route)}/${routeBasename}`,
        pageType: 'content',
        sidebarNavOptions
      }
    }
  };
};

export default createContent;
