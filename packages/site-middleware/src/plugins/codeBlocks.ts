import { Parser } from 'acorn';
import jsx from 'acorn-jsx';
import type { Code, Literal } from 'mdast';
import { Plugin, Transformer } from 'unified';
import visit from 'unist-util-visit';

const parser = Parser.extend(jsx());

/**
 * Modified from: https://github.com/remcohaszing/remark-mdx-code-meta
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
export const transformer: Transformer = ast => {
  visit<Code>(ast, 'code', (node, index, parent) => {
    if (!node.meta) {
      return;
    }
    // Limit eval to just basic strings that start with "meta."
    const isEval =
      /(^| )eval(="true"| |$)/.test(node.meta) && /^meta\.[a-z0-9_[\].$"']+$/i.test(node.value);

    let code;
    if (!isEval) {
      code = JSON.stringify(`${node.value}\n`);
    } else {
      code = node.value;
    }

    const codeProps = node.lang ? `className="language-${node.lang}"` : '';
    const value = `<pre ${node.meta}><code ${codeProps}>{${code}}</code></pre>`;
    const estree = parser.parse(value, { ecmaVersion: 'latest' });
    // eslint-disable-next-line no-param-reassign
    parent!.children[index] = { type: 'mdxFlowExpression', value, data: { estree } } as Literal;
  });
};

/**
 * A markdown plugin for transforming code metadata.
 *
 * @returns A unified transformer.
 */
export const codeBlocks: Plugin<[]> = () => transformer;
