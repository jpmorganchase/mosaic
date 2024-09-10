import type { Root } from 'hast';
import type { Plugin, Transformer } from 'unified';
import { visitParents } from 'unist-util-visit-parents';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { mdxjs } from 'micromark-extension-mdxjs';
import { mdxFromMarkdown } from 'mdast-util-mdx';
import { type MdxJsxFlowElementHast } from 'mdast-util-mdx-jsx';
// @ts-ignore
import { propertiesToMdxJsxAttributes } from 'hast-util-properties-to-mdx-jsx-attributes';

/**
 * Modified from: https://github.com/remcohaszing/rehype-mdx-code-props/blob/main/src/rehype-mdx-code-props.ts
 *
 * Custom meta parser for codefences that have extra params. e.g.
 * ```jsx filename="hello.jsx"
 * <div>Test!</div>
 * ```
 *
 * Custom meta parser for codefences that have eval or eval="true".
 * This allows vars to be resolved and their values used as the code block body.
 * ```jsx eval
 * meta.data.someStringOnlyAvailableAtRuntime
 * ```
 */
export const transformer: Transformer<Root> = ast => {
  visitParents(ast, 'element', (node, ancestors) => {
    if (node.tagName !== 'code') {
      return;
    }

    const meta = node.data?.meta;

    if (typeof meta !== 'string' || !meta) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let parent = ancestors.at(-1)!;

    if (parent.type !== 'element') {
      return;
    }

    if (parent.tagName !== 'pre') {
      return;
    }

    if (parent.children.length !== 1) {
      return;
    }

    const child = parent;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    parent = ancestors.at(-2)!;

    // Limit eval to just basic strings that start with "meta."
    // const isEval =
    //   /(^| )eval(="true"| |$)/.test(meta) && /^meta\.[a-z0-9_[\].$"']+$/i.test(child.value);
    //
    // let code;
    // if (!isEval) {
    //   code = JSON.stringify(`${child.value}\n`);
    // } else {
    //   code = child.value;
    // }

    const replacement = fromMarkdown(`<${child.tagName} ${meta} />`, {
      extensions: [mdxjs()],
      mdastExtensions: [mdxFromMarkdown()]
    }).children[0] as MdxJsxFlowElementHast;
    replacement.children = child.children;
    replacement.data = child.data;
    replacement.position = child.position;
    replacement.attributes.unshift(
      ...propertiesToMdxJsxAttributes(child.properties, { elementAttributeNameCase: 'react' })
    );

    parent.children[parent.children.indexOf(child)] = replacement;
  });
};

/**
 * A markdown plugin for transforming code metadata.
 *
 * @returns A unified transformer.
 */
export const codeBlocks: Plugin<[], Root> = () => transformer;
