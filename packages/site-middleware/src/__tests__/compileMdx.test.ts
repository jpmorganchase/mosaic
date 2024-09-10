import { describe, expect, it } from 'vitest';
import { compileMDX } from '../compileMdx.js';

describe('compileMdx', () => {
  it('should handle codeblocks', async () => {
    const result = await compileMDX('```jsx live\n<div>I will be live editable!</div>\n```');
    expect(result.compiledSource).toContain(`{
    live: true,
    children: _jsxDEV(_components.code, {
      className: "language-jsx",
      children: "<div>I will be live editable!</div>\\n"
    }, undefined, false, {
      fileName: "<source.js>",
      lineNumber: 1,
      columnNumber: 1
    }, this)
  }`);
  });
});
