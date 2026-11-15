import path from 'node:path';
import { pathToFileURL } from 'node:url';
import picomatch from 'picomatch';
import type { MarkdownPagesFile, Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';

import PluginError from './utils/PluginError.js';
import { lookup, type PageValues } from './utils/pageOutline.js';
import { plainText } from './utils/searchRecords.js';
import {
  toMarkdown,
  type MarkdownAttributeValue,
  type MarkdownComponent,
  type MarkdownComponents,
  type MarkdownElement
} from './utils/toMarkdown.js';

export type {
  MarkdownAttributeValue,
  MarkdownComponent,
  MarkdownComponents,
  MarkdownElement,
  MarkdownPagesFile
};

export const MARKDOWN_PAGES_FILE = '/markdown-pages.json';
export const LLMS_TXT_FILE = '/llms.txt';
export const LLMS_FULL_TXT_FILE = '/llms-full.txt';

export interface LlmsTxtPluginOptions {
  /** The heading of `llms.txt`. Defaults to `Documentation`. */
  title?: string;
  /** A summary of the site, shown under the heading of `llms.txt`. */
  description?: string;
  /** The site's origin, such as `https://example.com`, to make links absolute. */
  siteUrl?: string;
  /**
   * An absolute path, file URL or package whose default export converts the
   * site's own components to Markdown, as `{ ComponentName: converter }`.
   * See `MarkdownComponent`.
   */
  componentsModulePath?: string;
  /** Glob patterns of page files to leave out, such as `my-namespace/test/**`. */
  exclude?: string[];
}

interface LlmsTxtPluginPage extends Page {
  description?: unknown;
  data?: { description?: unknown };
  llms?: { exclude?: boolean };
}

interface MarkdownPage {
  title: string;
  description?: string;
  /** The page as Markdown, with YAML frontmatter. */
  markdown: string;
}

type LlmsTxtPluginData = { markdownPages?: Record<string, MarkdownPage> };

const MARKDOWN_EXTENSION = /\.mdx?$/;

const loadedComponents = new Map<string, Promise<MarkdownComponents>>();
function loadComponents(modulePath?: string): Promise<MarkdownComponents> {
  if (!modulePath) return Promise.resolve({});
  if (!loadedComponents.has(modulePath)) {
    const specifier = path.isAbsolute(modulePath) ? pathToFileURL(modulePath).href : modulePath;
    loadedComponents.set(
      modulePath,
      import(specifier).then(module => (module.default ?? module) as MarkdownComponents)
    );
  }
  return loadedComponents.get(modulePath)!;
}

const origin = (siteUrl?: string) => (siteUrl ?? '').replace(/\/+$/, '');

// Quoted, so YAML reads any text as a string.
const yamlString = (value: string) => JSON.stringify(value);

function renderPage(
  { route, title, description }: { route: string; title: string; description?: string },
  body: string,
  siteUrl?: string
) {
  const frontmatter = [
    '---',
    `title: ${yamlString(title)}`,
    ...(description ? [`description: ${yamlString(description)}`] : []),
    `url: ${yamlString(`${origin(siteUrl)}${route}`)}`,
    '---'
  ].join('\n');
  const index = `${origin(siteUrl)}${LLMS_TXT_FILE}`;
  return `${frontmatter}\n\n> For an index of all documentation, see [${index}](${index}).\n\n${body}\n`;
}

/** Index pages first, then the rest in route order. */
const compareRoutes = (a: string, b: string) => {
  const key = (route: string) => route.replace(/\/index$/, '/');
  return key(a).localeCompare(key(b));
};

const sectionOf = (route: string) => {
  const segments = route.split('/').filter(Boolean);
  return segments.length <= 2 ? `/${segments[0]}` : `/${segments[0]}/${segments[1]}`;
};

const label = (section: string) => {
  const name = section.split('/').filter(Boolean).pop() ?? '';
  const words = name.replace(/[-_]+/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** The `llms.txt` index: a section per top-level folder, linking each page's Markdown. */
export function buildLlmsTxt(
  pages: Record<string, MarkdownPage>,
  { title = 'Documentation', description, siteUrl }: LlmsTxtPluginOptions = {}
) {
  const link = (route: string) => `${origin(siteUrl)}${route}.md`;
  const sections = new Map<string, string[]>();
  for (const route of Object.keys(pages).sort(compareRoutes)) {
    const section = sectionOf(route);
    sections.set(section, [...(sections.get(section) ?? []), route]);
  }
  const lines = [`# ${title}`, ''];
  if (description) lines.push(`> ${description}`, '');
  for (const [section, routes] of sections) {
    const indexRoute = `${section}/index`;
    const index = pages[indexRoute];
    lines.push(index ? `## [${index.title}](${link(indexRoute)})` : `## ${label(section)}`, '');
    if (index?.description) lines.push(index.description, '');
    const items = routes.filter(route => route !== indexRoute);
    for (const route of items) {
      const page = pages[route];
      lines.push(
        `- [${page.title}](${link(route)})${page.description ? `: ${page.description}` : ''}`
      );
    }
    if (items.length > 0) lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

/**
 * Writes the site's docs as Markdown for agents and other tools, following
 * the [llms.txt](https://llmstxt.org) convention:
 *
 * - `markdown-pages.json`: every page as Markdown, served by the site at
 *   the page's URL plus `.md`;
 * - `llms.txt`: an index of the pages, with their descriptions;
 * - `llms-full.txt`: every page in one file.
 *
 * Pages with `llms: { exclude: true }` in their frontmatter, or that match the
 * `exclude` option, are left out.
 */
const LlmsTxtPlugin: PluginType<LlmsTxtPluginPage, LlmsTxtPluginOptions, LlmsTxtPluginData> = {
  async $beforeSend(
    mutableFilesystem,
    { config, serialiser, ignorePages, pageExtensions },
    options = {}
  ) {
    const components = await loadComponents(options.componentsModulePath);
    const pagePaths = (await mutableFilesystem.promises.glob('**', {
      onlyFiles: true,
      ignore: ignorePages.map(ignore => `**/${ignore}`),
      cwd: '/'
    })) as string[];
    // Matched against each page's own path, so aliases of excluded pages are excluded too.
    const isExcluded = picomatch(options.exclude ?? [], { dot: true });
    const markdownPages: Record<string, MarkdownPage> = {};
    const failures: string[] = [];
    for (const pagePath of pagePaths) {
      if (!MARKDOWN_EXTENSION.test(pagePath)) continue;
      if (!pageExtensions.some(extension => pagePath.endsWith(extension))) continue;
      const page = (await serialiser.deserialise(
        pagePath,
        await mutableFilesystem.promises.readFile(pagePath)
      )) as LlmsTxtPluginPage;
      if (typeof page.route !== 'string' || page.llms?.exclude === true) continue;
      if (isExcluded(String(page.fullPath ?? pagePath).replace(/^\//, ''))) continue;
      const values = page as unknown as PageValues & { route: string };
      const title = plainText(page.title) ?? page.route;
      const description =
        plainText(page.description) ?? plainText(lookup(values, 'data.description'));
      try {
        const body = await toMarkdown(values, {
          components
        });
        if (body === undefined) {
          console.warn(
            `[Mosaic][Plugin-LlmsTxt] ${pagePath} is not valid MDX, so it is left out of llms.txt`
          );
          continue;
        }
        markdownPages[page.route] = {
          title,
          description,
          markdown: renderPage({ route: page.route, title, description }, body, options.siteUrl)
        };
      } catch (error) {
        failures.push(`${pagePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    config.setData({ markdownPages });
    if (failures.length > 0) {
      throw new PluginError(
        `Couldn't convert ${failures.length} page(s) to Markdown:\n${failures.join('\n')}`
      );
    }
  },

  async afterUpdate(_, { sharedFilesystem, globalConfig }, options = {}) {
    const pages = globalConfig.data.markdownPages;
    if (!pages) return;
    const routes = Object.keys(pages).sort(compareRoutes);
    const file: MarkdownPagesFile = {
      version: 1,
      pages: Object.fromEntries(routes.map(route => [route, pages[route].markdown]))
    };
    await sharedFilesystem.promises.writeFile(MARKDOWN_PAGES_FILE, JSON.stringify(file));
    await sharedFilesystem.promises.writeFile(
      LLMS_FULL_TXT_FILE,
      routes.map(route => pages[route].markdown).join('\n')
    );
    await sharedFilesystem.promises.writeFile(LLMS_TXT_FILE, buildLlmsTxt(pages, options));
  }
};

export default LlmsTxtPlugin;
