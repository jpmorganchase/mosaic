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
    write(
      path.join(repoDir, '.prettierrc.json'),
      JSON.stringify({ plugins: ['prettier-plugin-that-is-not-installed'] })
    );
    expect(await formatSavedPage(page, editorOutput, repoDir)).toBe(editorOutput);
    expect(warn).toHaveBeenCalledOnce();
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

  test('only formats a new page', async () => {
    write(path.join(repoDir, '.prettierrc.json'), '{}');
    expect(
      await finishSavedPage({ filePath: page, content: editorOutput, original: undefined, repoDir })
    ).toBe(prettierOutput);
  });
});
