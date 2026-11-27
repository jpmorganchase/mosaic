import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { encodeRoutePathname } from '@jpmorganchase/mosaic-schemas/routePath';
import type { Node } from 'unist';
import type { Root } from 'mdast';

import { asText, lookup, type PageValues } from './pageOutline.js';

/** A JSX attribute: text, `true` when it has no value, or the source of an expression. */
export type MarkdownAttributeValue = string | true | { expression: string };

/** A JSX element in a page, given to a `MarkdownComponent`. */
export interface MarkdownElement {
  /** The element's name, such as `Callout` or `Tabs.Tab`. */
  name: string;
  attributes: Record<string, MarkdownAttributeValue>;
  /** The element's children, already converted to Markdown. Empty when it has none. */
  children: string;
  /** Whether the element is part of a line of text, rather than a block of its own. */
  inline: boolean;
}

/**
 * Converts one JSX element to Markdown. Return the Markdown, `null` to leave
 * the element out, or `undefined` to keep only its children, which is what
 * happens to elements without a converter.
 */
export type MarkdownComponent = (
  element: MarkdownElement,
  page: PageValues
) => string | null | undefined | Promise<string | null | undefined>;

export type MarkdownComponents = Record<string, MarkdownComponent>;

const calloutTitles: Record<string, string> = {
  caution: 'Caution',
  important: 'Important',
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning'
};

/** Converters for Mosaic's own components. A site's converters take precedence. */
export const defaultMarkdownComponents: MarkdownComponents = {
  Callout({ attributes, children }) {
    const variant =
      typeof attributes.variant === 'string' ? attributes.variant.toLowerCase() : 'note';
    const title =
      typeof attributes.title === 'string' ? attributes.title : calloutTitles[variant] ?? 'Note';
    const body = `**${title}:** ${children}`.trim();
    return body
      .split('\n')
      .map(line => (line ? `> ${line}` : '>'))
      .join('\n');
  }
};

const META_EXPRESSION = /^\s*meta((?:\.[A-Za-z_$][\w$]*)+)\s*$/;
const PHRASING = new Set([
  'text',
  'emphasis',
  'strong',
  'delete',
  'inlineCode',
  'break',
  'link',
  'linkReference',
  'image',
  'imageReference',
  'footnoteReference',
  'html',
  'mdxTextExpression',
  'mdxJsxTextElement'
]);

type AnyNode = Node & {
  value?: string;
  url?: string;
  name?: string | null;
  attributes?: Array<{ type: string; name?: string; value?: unknown }>;
  children?: AnyNode[];
};

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkGfm);
const stringifier = unified()
  .use(remarkGfm)
  .use(remarkStringify, { bullet: '-', fences: true, rule: '-', listItemIndent: 'one' });

const stringify = (children: AnyNode[]) => {
  const flow = children.every(child => PHRASING.has(child.type))
    ? [{ type: 'paragraph', children }]
    : children;
  return String(stringifier.stringify({ type: 'root', children: flow } as Root)).trim();
};

/**
 * Makes relative links absolute, so they work outside the page, such as in
 * `llms-full.txt`: root-relative, or on the site's origin when it's known.
 */
const resolveUrl = (url: string, route: string, siteUrl = '') => {
  if (/^([a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return url;
  const resolved = new URL(url, `https://mosaic.invalid${encodeRoutePathname(route)}`);
  return `${siteUrl}${resolved.pathname}${resolved.search}${resolved.hash}`;
};

function readAttributes(node: AnyNode) {
  const attributes: Record<string, MarkdownAttributeValue> = {};
  for (const attribute of node.attributes ?? []) {
    if (attribute.type !== 'mdxJsxAttribute' || !attribute.name) continue;
    const { value } = attribute;
    if (value == null) attributes[attribute.name] = true;
    else if (typeof value === 'string') attributes[attribute.name] = value;
    else attributes[attribute.name] = { expression: String((value as { value: unknown }).value) };
  }
  return attributes;
}

interface Context {
  page: PageValues;
  route: string;
  components: MarkdownComponents;
  /** The site's origin, without a trailing slash, or `''`. */
  siteUrl: string;
}

async function convertChildren(parent: AnyNode, context: Context) {
  if (!parent.children) return;
  const converted: AnyNode[] = [];
  for (const child of parent.children) {
    converted.push(...(await convertNode(child, context)));
  }
  parent.children = converted;
}

const isBlank = (node: AnyNode) => node.type === 'text' && !node.value?.trim();

/** Text without the spaces left at its ends by expressions and elements that were left out. */
function tidyText(parent: AnyNode) {
  const children = parent.children ?? [];
  const first = children[0];
  const last = children[children.length - 1];
  if (first?.type === 'text') first.value = first.value?.trimStart();
  if (last?.type === 'text') last.value = last.value?.trimEnd();
  parent.children = children.filter(child => child.type !== 'text' || child.value);
  return parent.children.length > 0;
}

async function convertNode(node: AnyNode, context: Context): Promise<AnyNode[]> {
  switch (node.type) {
    case 'paragraph': {
      // An element on a line of its own is a block, though MDX parses it as
      // inline when its children are on the same line, as in `<X>text</X>`.
      const significant = (node.children ?? []).filter(child => !isBlank(child));
      if (significant.length === 1 && significant[0].type === 'mdxJsxTextElement') {
        return convertElement(significant[0], context, false);
      }
      await convertChildren(node, context);
      return tidyText(node) ? [node] : [];
    }
    case 'heading':
    case 'tableCell':
      await convertChildren(node, context);
      tidyText(node);
      return [node];
    case 'mdxjsEsm':
      return [];
    case 'mdxFlowExpression':
    case 'mdxTextExpression': {
      const path = META_EXPRESSION.exec(node.value ?? '')?.[1];
      const value = path ? asText(lookup(context.page, path)) : undefined;
      if (value === undefined) return [];
      const text = { type: 'text', value } as AnyNode;
      return node.type === 'mdxFlowExpression' ? [{ type: 'paragraph', children: [text] }] : [text];
    }
    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement':
      return convertElement(node, context, node.type === 'mdxJsxTextElement');
    case 'link':
    case 'image':
    case 'definition':
      if (node.url) node.url = resolveUrl(node.url, context.route, context.siteUrl);
      await convertChildren(node, context);
      return [node];
    default:
      await convertChildren(node, context);
      return [node];
  }
}

async function convertElement(
  node: AnyNode,
  context: Context,
  inline: boolean
): Promise<AnyNode[]> {
  await convertChildren(node, context);
  const children = node.children ?? [];
  const name = node.name ?? '';
  const convert = name ? context.components[name] : undefined;
  const result = convert
    ? await convert(
        { name, attributes: readAttributes(node), children: stringify(children), inline },
        context.page
      )
    : undefined;
  if (result === null) return [];
  if (typeof result === 'string') {
    return result.trim() ? [{ type: 'html', value: result.trim() } as AnyNode] : [];
  }
  if (!inline && children.length > 0 && children.every(child => PHRASING.has(child.type))) {
    const paragraph = { type: 'paragraph', children } as AnyNode;
    return tidyText(paragraph) ? [paragraph] : [];
  }
  return children;
}

export interface ToMarkdownOptions {
  /** Converters for the site's JSX components, by name. */
  components?: MarkdownComponents;
  /** The site's origin, such as `https://example.com`. Links stay root-relative without it. */
  siteUrl?: string;
}

/**
 * Converts a page's MDX to Markdown that reads well without a browser:
 *
 * - `{meta.*}` expressions are replaced with their values, and other
 *   expressions and `import`/`export` statements are left out;
 * - JSX elements are converted with `components`, then Mosaic's defaults,
 *   and otherwise replaced with their children;
 * - relative links and images are made absolute, on `siteUrl` when it's set;
 * - code blocks, tables and other Markdown are kept.
 *
 * Returns `undefined` when the page isn't valid MDX.
 */
export async function toMarkdown(
  page: PageValues & { route: string; content?: unknown },
  { components = {}, siteUrl }: ToMarkdownOptions = {}
): Promise<string | undefined> {
  const content = typeof page.content === 'string' ? page.content.replaceAll('\r', '') : '';
  let tree: AnyNode;
  try {
    tree = parser.parse(content) as AnyNode;
  } catch {
    return undefined;
  }
  await convertChildren(tree, {
    page,
    route: page.route,
    components: { ...defaultMarkdownComponents, ...components },
    siteUrl: (siteUrl ?? '').replace(/\/+$/, '')
  });
  return stringify(tree.children ?? []);
}
