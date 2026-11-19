import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { finishSavedPage, formatSavedPage } from '../formatSavedPage.js';

// What the editor writes: Lexical's emphasis, four-space nested lists and no
// blank line after the frontmatter.
const editorOutput = `---
title: Page
---
# Page

> *"Quoted"*

- The installer prompts for:
    - Agent platform
    - Scope
`;
const prettierOutput = `---
title: Page
---

# Page

> _"Quoted"_

- The installer prompts for:
  - Agent platform
  - Scope
`;

let root: string;
let repoDir: string;
let page: string;
const write = (file: string, content: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'mosaic-format-'));
  repoDir = path.join(root, 'clone');
  page = path.join(repoDir, 'docs/page.mdx');
  write(page, editorOutput);
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('formatSavedPage', () => {
  test("formats the page with the repository's Prettier configuration", async () => {
    write(path.join(repoDir, '.prettierrc.json'), '{}');
    expect(await formatSavedPage(page, editorOutput, repoDir)).toBe(prettierOutput);
  });

  test('uses the options the repository sets', async () => {
    write(
      path.join(repoDir, '.prettierrc.json'),
      JSON.stringify({ proseWrap: 'always', printWidth: 20 })
    );
    const formatted = await formatSavedPage(
      page,
      '---\ntitle: Page\n---\n\nA paragraph long enough to wrap at twenty columns.\n',
      repoDir
    );
    expect(formatted).toBe(
      '---\ntitle: Page\n---\n\nA paragraph long\nenough to wrap at\ntwenty columns.\n'
    );
  });

  test('reads a "prettier" key in package.json as configuration', async () => {
    write(path.join(repoDir, 'package.json'), JSON.stringify({ name: 'docs', prettier: {} }));
    expect(await formatSavedPage(page, editorOutput, repoDir)).toBe(prettierOutput);
  });

  test('leaves the page alone in a repository without a Prettier configuration', async () => {
    expect(await formatSavedPage(page, editorOutput, repoDir)).toBe(editorOutput);
  });

  test('ignores a configuration outside the repository', async () => {
    write(path.join(root, '.prettierrc.json'), '{}');
    expect(await formatSavedPage(page, editorOutput, repoDir)).toBe(editorOutput);
  });

  test('leaves a page the repository tells Prettier to ignore', async () => {
    write(path.join(repoDir, '.prettierrc.json'), '{}');
    write(path.join(repoDir, '.prettierignore'), 'docs/\n');
    expect(await formatSavedPage(page, editorOutput, repoDir)).toBe(editorOutput);
  });

  test("saves the page as written when Prettier can't format it", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    write(path.join(repoDir, '.prettierrc.json'), JSON.stringify({ proseWrap: 'sometimes' }));
    expect(await formatSavedPage(page, editorOutput, repoDir)).toBe(editorOutput);
    expect(warn).toHaveBeenCalledOnce();
  });

  test.each([
    ['.prettierrc', 'proseWrap: preserve\n'],
    ['.prettierrc.yaml', 'proseWrap: preserve\n'],
    ['.prettierrc.json5', "// Shared with the website\n{ proseWrap: 'preserve' }\n"],
    ['.prettierrc.toml', 'proseWrap = "preserve"\n'],
    ['package.yaml', 'name: docs\nprettier:\n  proseWrap: preserve\n']
  ])('reads a %s configuration', async (name, config) => {
    write(path.join(repoDir, name), config);
    expect(await formatSavedPage(page, editorOutput, repoDir)).toBe(prettierOutput);
  });
});

describe("formatSavedPage doesn't run code from the repository", () => {
  // Each module records that it ran by creating `ran`.
  const ran = () => path.join(root, 'ran');
  const esm = () =>
    `import fs from 'node:fs';\nfs.writeFileSync(${JSON.stringify(
      ran()
    )}, '');\nexport default {};\n`;
  const cjs = () =>
    `require('node:fs').writeFileSync(${JSON.stringify(ran())}, '');\nmodule.exports = {};\n`;

  test.each<[string, () => Record<string, string>]>([
    ['a JavaScript configuration', () => ({ 'prettier.config.mjs': esm() })],
    ['a CommonJS configuration', () => ({ '.prettierrc.cjs': cjs() })],
    [
      'a plugin',
      () => ({
        '.prettierrc.json': JSON.stringify({ plugins: ['./tools/plugin.mjs'] }),
        'tools/plugin.mjs': esm()
      })
    ],
    [
      "a plugin in an override for the page's files",
      () => ({
        '.prettierrc.json': JSON.stringify({
          overrides: [{ files: '*.mdx', options: { plugins: ['./tools/plugin.mjs'] } }]
        }),
        'tools/plugin.mjs': esm()
      })
    ],
    [
      'a shared configuration named in package.json',
      () => ({
        'package.json': JSON.stringify({ name: 'docs', prettier: './tools/shared.cjs' }),
        'tools/shared.cjs': cjs()
      })
    ],
    [
      'a shared configuration named in .prettierrc',
      () => ({ '.prettierrc': './tools/shared.cjs\n', 'tools/shared.cjs': cjs() })
    ],
    [
      'a shared configuration named in .prettierrc.json5',
      () => ({ '.prettierrc.json5': "'./tools/shared.mjs'\n", 'tools/shared.mjs': esm() })
    ],
    // JSON5 ends a `//` comment at any line terminator, so `{` here is in
    // a block comment and the value is the string.
    ...['\r', '\u2028', '\u2029'].map((terminator): [string, () => Record<string, string>] => [
      `a shared configuration in .prettierrc.json5 after a comment ended by U+${terminator
        .charCodeAt(0)
        .toString(16)
        .toUpperCase()
        .padStart(4, '0')}`,
      () => ({
        '.prettierrc.json5': `// a${terminator}/* \n{ */ './tools/shared.mjs'\n`,
        'tools/shared.mjs': esm()
      })
    ])
  ])('%s', async (_, files) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const [name, content] of Object.entries(files())) write(path.join(repoDir, name), content);
    expect(await formatSavedPage(page, editorOutput, repoDir)).toBe(editorOutput);
    expect(fs.existsSync(ran())).toBe(false);
    expect(warn).toHaveBeenCalledOnce();
  });

  test('without a warning for a page the repository tells Prettier to ignore', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    write(path.join(repoDir, 'prettier.config.mjs'), esm());
    write(path.join(repoDir, '.prettierignore'), 'docs/\n');
    expect(await formatSavedPage(page, editorOutput, repoDir)).toBe(editorOutput);
    expect(fs.existsSync(ran())).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('finishSavedPage', () => {
  const original = '---\ntitle: Page\n---\n\n- a\n\n- b\n\n- c\n';

  test('keeps a loose list loose throughout when one item is edited', async () => {
    write(path.join(repoDir, '.prettierrc.json'), '{}');
    expect(
      await finishSavedPage({
        filePath: page,
        content: '---\ntitle: Page\n---\n- a\n- B edited\n- c\n',
        original,
        repoDir
      })
    ).toBe('---\ntitle: Page\n---\n\n- a\n\n- B edited\n\n- c\n');
  });

  test('keeps the original blank lines in a repository without Prettier', async () => {
    expect(
      await finishSavedPage({
        filePath: page,
        content: '---\ntitle: Page\n---\n- a\n- b\n- c\n',
        original,
        repoDir
      })
    ).toBe(original);
  });

  test('keeps the blank lines the author added or removed', async () => {
    write(path.join(repoDir, '.prettierrc.json'), '{}');
    const frontmatter = '---\ntitle: Page\n---\n\n';
    const save = (before: string, after: string) =>
      finishSavedPage({
        filePath: page,
        content: frontmatter + after,
        original: frontmatter + before,
        repoDir
      });
    const split = 'Line one of a\n\nwrapped paragraph\n';
    expect(await save('Line one of a\nwrapped paragraph\n', split)).toBe(frontmatter + split);
    const joined = 'First paragraph\nsecond paragraph\n';
    expect(await save('First paragraph\n\nsecond paragraph\n', joined)).toBe(frontmatter + joined);
    const tight = '```js\na();\nb();\n```\n';
    const spaced = '```js\na();\n\nb();\n```\n';
    expect(await save(tight, spaced)).toBe(frontmatter + spaced);
    expect(await save(spaced, tight)).toBe(frontmatter + tight);
  });

  test('keeps the frontmatter as it was saved', async () => {
    const before = '---\ndescription: |-\n  First.\n\n  Second.\n---\n\nBody\n';
    const after = '---\ndescription: |-\n  First.\n  Second.\n---\nBody\n';
    expect(
      await finishSavedPage({ filePath: page, content: after, original: before, repoDir })
    ).toBe('---\ndescription: |-\n  First.\n  Second.\n---\n\nBody\n');
  });

  test.each([
    ['its configuration would run code', { 'prettier.config.mjs': 'export default {};\n' }],
    ["Prettier can't format it", { '.prettierrc.json': JSON.stringify({ proseWrap: 'sometimes' }) }]
  ])('warns once when %s', async (_, files) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const [name, content] of Object.entries(files)) write(path.join(repoDir, name), content);
    expect(
      await finishSavedPage({
        filePath: page,
        content: '---\ntitle: Page\n---\n- a\n- b\n- c\n',
        original,
        repoDir
      })
    ).toBe(original);
    expect(warn).toHaveBeenCalledOnce();
  });

  test('only formats a new page', async () => {
    write(path.join(repoDir, '.prettierrc.json'), '{}');
    expect(
      await finishSavedPage({ filePath: page, content: editorOutput, original: undefined, repoDir })
    ).toBe(prettierOutput);
  });
});
