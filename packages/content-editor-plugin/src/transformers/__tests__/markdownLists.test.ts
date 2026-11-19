/**
 * Lists in the editor's Markdown round trip. Repositories formatted with
 * Prettier (or written by hand to CommonMark) nest a list by its parent's
 * content column: two spaces under `- `, three under `1. `. Lexical before
 * 0.50 only nested by four spaces, so those sublists were flattened into
 * top-level items and a save rewrote the page's structure.
 */
import { describe, expect, test } from 'vitest';
import { $getRoot, createEditor } from 'lexical';
import { $isListItemNode, $isListNode, type ListNode } from '@lexical/list';
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';

import { nodes } from '../../nodes';
import transformers from '../index';

function load(markdown: string) {
  const editor = createEditor({
    nodes,
    onError: error => {
      throw error;
    }
  });
  editor.update(() => $convertFromMarkdownString(markdown, transformers), { discrete: true });
  return editor;
}

/**
 * `[list]` where each top-level list starts, then its items' text indented two
 * spaces per nesting level; other blocks as `[type] text`.
 */
function outline(markdown: string): string[] {
  return load(markdown)
    .getEditorState()
    .read(() => {
      const lines: string[] = [];
      const walk = (list: ListNode, depth: number) => {
        for (const item of list.getChildren()) {
          if (!$isListItemNode(item)) continue;
          const [first] = item.getChildren();
          if (item.getChildrenSize() === 1 && $isListNode(first)) {
            walk(first, depth + 1);
            continue;
          }
          lines.push(`${'  '.repeat(depth)}${item.getTextContent()}`);
        }
      };
      for (const block of $getRoot().getChildren()) {
        if ($isListNode(block)) {
          lines.push('[list]');
          walk(block, 0);
        } else lines.push(`[${block.getType()}] ${block.getTextContent()}`);
      }
      return lines;
    });
}

const roundTrip = (markdown: string) =>
  load(markdown)
    .getEditorState()
    .read(() => $convertToMarkdownString(transformers));

describe('markdown lists', () => {
  test('nests a bullet list indented by two spaces', () => {
    expect(outline('- a\n  - b\n  - c\n- d')).toEqual(['[list]', 'a', '  b', '  c', 'd']);
  });

  test('nests a list under a numbered item by three spaces', () => {
    expect(outline('1. a\n   - b\n2. c')).toEqual(['[list]', 'a', '  b', 'c']);
  });

  test('still nests the four-space lists the editor used to write', () => {
    expect(outline('- a\n    - b\n        - c')).toEqual(['[list]', 'a', '  b', '    c']);
  });

  test('keeps a loose list as one list', () => {
    expect(outline('- a\n\n- b\n\n- c')).toEqual(['[list]', 'a', 'b', 'c']);
  });

  test('keeps the nesting of a Prettier-formatted page through a save', () => {
    const page = [
      '- Use `--yes` to force a fresh download.',
      '- The installer will prompt for:',
      '  - **Agent platform:** GitHub Copilot or Claude Code',
      '  - **Scope:** Global or Project installation'
    ].join('\n');

    const saved = roundTrip(page);

    expect(outline(saved)).toEqual(outline(page));
    expect(outline(page)).toEqual([
      '[list]',
      'Use --yes to force a fresh download.',
      'The installer will prompt for:',
      '  Agent platform: GitHub Copilot or Claude Code',
      '  Scope: Global or Project installation'
    ]);
  });
});
