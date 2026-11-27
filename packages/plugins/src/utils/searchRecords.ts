import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import { toString } from 'mdast-util-to-string';
import { SKIP, visit } from 'unist-util-visit';
import type { Node, Parent } from 'unist';
import type { SearchRecord } from '@jpmorganchase/mosaic-types';
import { pageRoutePathname } from '@jpmorganchase/mosaic-schemas/routePath';

import {
  asText,
  createHeadingSlugger,
  lookup,
  resolveHeading,
  type PageValues
} from './pageOutline.js';

export type { SearchRecord };

export interface SearchRecordOptions {
  /**
   * Frontmatter to index, as `{ field: path }`. A path is dotted (`data.description`);
   * list several to use the first one that's set. Values must be text or a list of text.
   */
  fields?: Record<string, string | string[]>;
  /** The deepest heading level that starts a new record. Deeper headings stay in their section. */
  sectionDepth?: number;
  /** Text longer than this is cut, to keep the records file small. */
  maxTextLength?: number;
}

export const defaultRecordFields: Record<string, string[]> = {
  description: ['description', 'data.description'],
  keywords: ['keywords']
};

const DEFAULT_SECTION_DEPTH = 3;
const DEFAULT_MAX_TEXT_LENGTH = 4000;
const META_EXPRESSION = /^\s*meta((?:\.[A-Za-z_$][\w$]*)+)\s*$/;

type Literal = Node & { value: string };
type Heading = Parent & { depth: number };

const processor = unified().use(remarkParse).use(remarkMdx);
// Frontmatter text is markdown, not MDX: `{` is just a character.
const markdownProcessor = unified().use(remarkParse);

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Frontmatter text without its markdown, e.g. "`Dropdown` lets" becomes "Dropdown lets". */
export const plainText = (value: unknown) => {
  const text = asText(value);
  return text === undefined ? undefined : collapse(toString(markdownProcessor.parse(text)));
};

const fieldValue = (value: unknown): string | string[] | undefined => {
  const text = plainText(value);
  if (text !== undefined) return text;
  if (Array.isArray(value)) {
    const list = value.map(plainText).filter((item): item is string => item !== undefined);
    return list.length > 0 ? list : undefined;
  }
  return undefined;
};

function readFields(page: PageValues, fields: Record<string, string | string[]>) {
  const result: Record<string, string | string[]> = {};
  for (const [name, paths] of Object.entries(fields)) {
    for (const path of ([] as string[]).concat(paths)) {
      const value = fieldValue(lookup(page, path));
      if (value !== undefined) {
        result[name] = value;
        break;
      }
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Splits a page into search records. Returns `undefined` when the page
 * isn't valid MDX; the caller decides whether to log it.
 */
export function buildSearchRecords(
  page: PageValues & { route: string; title?: unknown; content?: unknown },
  {
    fields = defaultRecordFields,
    sectionDepth = DEFAULT_SECTION_DEPTH,
    maxTextLength = DEFAULT_MAX_TEXT_LENGTH
  }: SearchRecordOptions = {},
  pageExtensions?: readonly string[]
): SearchRecord[] | undefined {
  const content = typeof page.content === 'string' ? page.content.replaceAll('\r', '') : '';
  let tree: Node;
  try {
    tree = processor.parse(content);
  } catch {
    return undefined;
  }

  const route = page.route;
  const title = asText(page.title) ?? '';
  const namespace = route.split('/')[1] ?? '';
  const slug = createHeadingSlugger();
  const intro = {
    anchor: undefined as string | undefined,
    headings: [] as string[],
    parts: [] as string[]
  };
  const sections: typeof intro[] = [intro];
  let current = intro;
  const path: { depth: number; text: string }[] = [];

  visit(tree, (node: Node) => {
    switch (node.type) {
      case 'heading': {
        const heading = node as Heading;
        const { text, slugText } = resolveHeading(page, heading);
        // Every heading takes a slug, in order, so ids match `rehype-slug`.
        const anchor = slug(slugText);
        if (heading.depth === 1) return SKIP;
        if (heading.depth <= sectionDepth) {
          while (path.length > 0 && path[path.length - 1].depth >= heading.depth) path.pop();
          path.push({ depth: heading.depth, text });
          current = { anchor, headings: path.map(entry => entry.text), parts: [] };
          sections.push(current);
        } else {
          current.parts.push(text);
        }
        return SKIP;
      }
      case 'text':
      case 'inlineCode':
        current.parts.push((node as Literal).value);
        return undefined;
      case 'mdxTextExpression':
      case 'mdxFlowExpression': {
        // Body text such as `{meta.data.description}` renders the value.
        const match = META_EXPRESSION.exec((node as Literal).value);
        const value = match ? asText(lookup(page, match[1])) : undefined;
        if (value !== undefined) current.parts.push(value);
        return SKIP;
      }
      case 'code':
      case 'html':
      case 'mdxjsEsm':
        return SKIP;
      default:
        return undefined;
    }
  });

  const pageFields = readFields(page, fields);
  const pathname = pageRoutePathname(route, page.fullPath, pageExtensions);
  return sections.map(({ anchor, headings, parts }) => {
    const record: SearchRecord = {
      // An empty slug is a section without a usable fragment. Keep its ID
      // distinct from the introduction even though both link to the page.
      id: anchor === undefined ? pathname : `${pathname}#${encodeURIComponent(anchor)}`,
      route,
      ...(pathname !== route && { pathname }),
      title,
      headings,
      text: collapse(parts.join(' ')).slice(0, maxTextLength),
      namespace
    };
    if (anchor) record.anchor = anchor;
    if (anchor === undefined && pageFields) record.fields = pageFields;
    return record;
  });
}
