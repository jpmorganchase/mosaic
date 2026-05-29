import { describe, expect, it } from 'vitest';
import { compileMDX } from '../compileMdx.js';

describe('compileMdx', () => {
  it('should handle codeblocks', async () => {
    // The `codeBlocks` remark plugin should promote ` ```jsx live ` to a
    // `<pre>` with a `live: true` prop wrapping a `<code className="language-jsx">`
    // node. The exact JSX-runtime helper varies with the MDX dep
    // (`_jsxDEV` under `next-mdx-remote`, `_jsx` under
    // `next-mdx-remote-client`), so assert on the structural properties
    // rather than the helper identifier.
    const result = await compileMDX('```jsx live\n<div>I will be live editable!</div>\n```');

    // Narrow off the error variant of the SerializeResult union (the
    // new `next-mdx-remote-client/serialize` library returns either
    // `{ compiledSource, frontmatter, scope }` or `{ error, ... }`).
    if ('error' in result) {
      throw result.error;
    }

    // The `<pre>` carries the `live: true` prop.
    expect(result.compiledSource).toContain('live: true');
    // The inner `<code>` carries the language class.
    expect(result.compiledSource).toContain('className: "language-jsx"');
    // The original source is preserved verbatim as the children.
    expect(result.compiledSource).toContain('children: "<div>I will be live editable!</div>\\n"');
  });
});
