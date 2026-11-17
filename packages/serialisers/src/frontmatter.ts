import { dump, load } from 'js-yaml';
import { frontmatterSchema } from './frontmatterSchema.js';

/**
 * YAML-only front matter parsing and serialisation.
 *
 * This replaces `gray-matter`, which evaluates `---js` / `---javascript`
 * front matter with `eval` and so lets anyone who can author content run
 * code wherever that content is parsed. Only YAML is supported here: any
 * other language after the opening fence is rejected.
 *
 * Parsing and serialisation otherwise follow `gray-matter`'s rules, so
 * existing content parses identically and saved files keep their format.
 */

export type FrontmatterData = Record<string, any>;

export interface ParsedFrontmatter {
  /** The parsed YAML front matter, or `{}` when there is none. */
  data: FrontmatterData;
  /** The content after the front matter block. */
  content: string;
}

const OPEN = '---';
const CLOSE = '\n---';
const YAML_LANGUAGES = new Set(['', 'yaml', 'yml']);

function stripBom(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function toText(input: string | Uint8Array) {
  return stripBom(typeof input === 'string' ? input : new TextDecoder().decode(input));
}

function withTrailingNewline(value: string) {
  return value.endsWith('\n') ? value : `${value}\n`;
}

export function parseFrontmatter(input: string | Uint8Array): ParsedFrontmatter {
  const text = toText(input);
  // `----` and longer rules are content, not an opening fence.
  if (!text.startsWith(OPEN) || text.charAt(OPEN.length) === '-') {
    return { data: {}, content: text };
  }

  let rest = text.slice(OPEN.length);
  const lineEnd = rest.search(/\r?\n/);
  const languageTag = lineEnd === -1 ? rest : rest.slice(0, lineEnd);
  const language = languageTag.trim().toLowerCase();
  if (!YAML_LANGUAGES.has(language)) {
    throw new Error(
      `Unsupported front matter language '${languageTag.trim()}'. Only YAML front matter is supported.`
    );
  }
  if (language) {
    rest = rest.slice(languageTag.length);
  }

  const closeIndex = rest.indexOf(CLOSE);
  const block = closeIndex === -1 ? rest : rest.slice(0, closeIndex);
  const isEmpty = block.replace(/^\s*#[^\n]+/gm, '').trim() === '';
  const data = isEmpty
    ? {}
    : (load(block, { schema: frontmatterSchema }) as FrontmatterData | null | undefined) ?? {};

  let content = closeIndex === -1 ? '' : rest.slice(closeIndex + CLOSE.length);
  if (content.startsWith('\r')) {
    content = content.slice(1);
  }
  if (content.startsWith('\n')) {
    content = content.slice(1);
  }

  return { data, content };
}

export function stringifyFrontmatter(content: string, data: FrontmatterData): string {
  const body = withTrailingNewline(stripBom(content));
  const yaml = dump({ ...data }, { schema: frontmatterSchema }).trim();
  return yaml === '{}' ? body : `${OPEN}\n${yaml}\n${OPEN}\n${body}`;
}
