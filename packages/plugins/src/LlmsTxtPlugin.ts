import path from 'node:path';
import { pathToFileURL } from 'node:url';
import picomatch from 'picomatch';
import { encodeRoutePathname } from '@jpmorganchase/mosaic-schemas/routePath';
import type {
  IVolumeMutable,
  ImmutableData,
  LlmsManifest,
  MarkdownPagesFile,
  Page,
  Plugin as PluginType
} from '@jpmorganchase/mosaic-types';

import PluginError from './utils/PluginError.js';
import { lookup, type PageValues } from './utils/pageOutline.js';
import { plainText } from './utils/searchRecords.js';
import { createPageTest } from './utils/createPageTest.js';
import {
  normalizeScopes,
  mostSpecificScope,
  withinScope,
  type LlmsTxtScope
} from './utils/llmsScopes.js';
import { normalizeSiteUrl } from './utils/llmsSiteUrl.js';
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
export const LLMS_MANIFEST_FILE = '/llms-manifest.json';
export type { LlmsTxtScope };

export interface LlmsTxtPluginOptions {
  /** The heading of `llms.txt`. Defaults to `Documentation`. */
  title?: string;
  /** A summary of the site, shown under the heading of `llms.txt`. */
  description?: string;
  /**
   * The site's origin, such as `https://example.com`, to make links absolute.
   * Must be an http(s) URL without credentials, a query or a fragment.
   */
  siteUrl?: string;
  /**
   * An absolute path, file URL or package whose default export converts the
   * site's own components to Markdown, as `{ ComponentName: converter }`.
   * See `MarkdownComponent`.
   */
  componentsModulePath?: string;
  /** Glob patterns of page files to leave out, such as `my-namespace/test/**`. */
  exclude?: string[];
  /** Public path scopes. Parent indexes include descendants; page discovery uses the longest match. */
  scopes?: LlmsTxtScope[];
  /**
   * Frontmatter keys to copy into each page's Markdown frontmatter, such as
   * `['version', 'tags']`. Text, numbers, booleans, dates (as ISO 8601) and
   * lists of them are copied; other values are left out.
   */
  frontmatterFields?: string[];
}

interface LlmsTxtPluginPage extends Page {
  description?: unknown;
  data?: { description?: unknown };
  llms?: { exclude?: boolean };
}

interface MarkdownPage {
  title: string;
  description?: string;
  /** When the page last changed, as ISO 8601, if its source knows. */
  lastModified?: string;
  /** Extra frontmatter, as `[key, YAML value]`, from the `frontmatterFields` option. */
  fields?: [string, string][];
  /** Converted body in source data; rendered Markdown in generated artifacts. */
  markdown: string;
}

type LlmsTxtPluginData = {
  markdownPages?: Record<string, MarkdownPage>;
  /** Includes excluded pages so another page cannot reuse their canonical route. */
  llmsRouteClaims?: string[];
};

// Sources may finish concurrently. Publish a complete generation at a time on
// each shared volume, including removal of the previous generation's scopes.
const writes = new WeakMap<IVolumeMutable, Promise<void>>();

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

/** When the page last changed, as an ISO 8601 date, if its source knows. */
function isoDate(value: unknown): string | undefined {
  let date: Date | undefined;
  if (value instanceof Date) date = value;
  else if (typeof value === 'number') date = new Date(value);
  else if (typeof value === 'string' && value.trim() !== '') {
    date = new Date(/^\d+$/.test(value) ? Number(value) : value);
  }
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
}

type Scalar = string | number | boolean;
const isScalar = (value: unknown): value is Scalar =>
  typeof value === 'string' ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));

// YAML reads an unquoted date, such as `published: 2024-05-01`, as a Date.
const plainValue = (value: unknown): Scalar | undefined =>
  value instanceof Date ? isoDate(value) : isScalar(value) ? value : undefined;

/** A frontmatter value as YAML, or `undefined` when it can't be copied. JSON is valid YAML. */
function yamlValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const items = value.map(plainValue);
    return items.every(item => item !== undefined) ? JSON.stringify(items) : undefined;
  }
  const item = plainValue(value);
  return item === undefined ? undefined : JSON.stringify(item);
}

const RESERVED_FIELDS = new Set(['title', 'description', 'url', 'lastModified']);

function renderPage(
  {
    route,
    title,
    description,
    lastModified,
    fields = []
  }: Omit<MarkdownPage, 'markdown'> & { route: string },
  body: string,
  siteUrl?: string,
  scope = ''
) {
  const frontmatter = [
    '---',
    `title: ${yamlString(title)}`,
    ...(description ? [`description: ${yamlString(description)}`] : []),
    `url: ${yamlString(`${origin(siteUrl)}${encodeRoutePathname(route)}`)}`,
    ...(lastModified ? [`lastModified: ${yamlString(lastModified)}`] : []),
    ...fields.map(([key, value]) => `${key}: ${value}`),
    '---'
  ].join('\n');
  const index = `${origin(siteUrl)}${scope}${LLMS_TXT_FILE}`;
  return `${frontmatter}\n\n> For an index of ${
    scope ? 'this' : 'all'
  } documentation, see [${index}](${index}).\n\n${body}\n`;
}

/** Index pages first, then the rest in route order. */
const compareRoutes = (a: string, b: string) => {
  const key = (route: string) => route.replace(/\/index$/, '/');
  return key(a).localeCompare(key(b));
};

// The root page is the site's index page, so it heads a section of its own.
const sectionOf = (route: string) => {
  const segments = route.split('/').filter(Boolean);
  if (segments.length === 0) return '/';
  return segments.length <= 2 ? `/${segments[0]}` : `/${segments[0]}/${segments[1]}`;
};

const label = (section: string) => {
  const name = section.split('/').filter(Boolean).pop() ?? 'home';
  const words = name.replace(/[-_]+/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * The `llms.txt` index: the root page first, then a section per top-level
 * folder, linking each page's Markdown.
 */
export function buildLlmsTxt(
  pages: Record<string, MarkdownPage>,
  { title = 'Documentation', description, siteUrl, scopes }: LlmsTxtPluginOptions = {}
) {
  const link = (route: string) => `${origin(siteUrl)}${encodeRoutePathname(route)}.md`;
  const sections = new Map<string, string[]>();
  for (const route of Object.keys(pages).sort(compareRoutes)) {
    const section = sectionOf(route);
    sections.set(section, [...(sections.get(section) ?? []), route]);
  }
  const lines = [`# ${title}`, ''];
  if (description) lines.push(`> ${description}`, '');
  if (scopes?.length) {
    lines.push('## Documentation scopes', '');
    for (const scope of normalizeScopes(scopes)) {
      lines.push(
        `- [${scope.title ?? scope.path}](${origin(siteUrl)}${scope.path}/llms.txt)${
          scope.description ? `: ${scope.description}` : ''
        }`
      );
    }
    lines.push('');
  }
  for (const [section, routes] of sections) {
    const indexRoute = section === '/' ? section : `${section}/index`;
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
    normalizeScopes(options.scopes);
    const siteUrl = normalizeSiteUrl(options.siteUrl);
    const components = await loadComponents(options.componentsModulePath);
    const pagePaths = (await mutableFilesystem.promises.glob('**', {
      onlyFiles: true,
      ignore: ignorePages.map(ignore => `**/${ignore}`),
      cwd: '/'
    })) as string[];
    // Matched against each page's own path, so aliases of excluded pages are excluded too.
    const isExcluded = picomatch(options.exclude ?? [], { dot: true });
    const markdownPages: Record<string, MarkdownPage> = {};
    const llmsRouteClaims: string[] = [];
    const seenFiles = new Set<string>();
    const isPage = createPageTest(ignorePages, pageExtensions);
    const failures: string[] = [];
    for (const pagePath of pagePaths.sort()) {
      if (!MARKDOWN_EXTENSION.test(pagePath)) continue;
      if (!pageExtensions.some(extension => pagePath.endsWith(extension))) continue;
      const realPath = String(await mutableFilesystem.promises.realpath(pagePath));
      if (seenFiles.has(realPath)) continue;
      seenFiles.add(realPath);
      const page = (await serialiser.deserialise(
        pagePath,
        await mutableFilesystem.promises.readFile(pagePath)
      )) as LlmsTxtPluginPage;
      if (typeof page.route !== 'string') continue;
      llmsRouteClaims.push(page.route);
      // An alias must not resurrect an ignored or excluded backing page.
      if (!isPage(String(page.fullPath ?? realPath)) || page.llms?.exclude === true) continue;
      if (isExcluded(String(page.fullPath ?? pagePath).replace(/^\//, ''))) continue;
      const values = page as unknown as PageValues & { route: string };
      const title = plainText(page.title) ?? page.route;
      const description =
        plainText(page.description) ?? plainText(lookup(values, 'data.description'));
      try {
        const body = await toMarkdown(values, { components, siteUrl });
        if (body === undefined) {
          console.warn(
            `[Mosaic][Plugin-LlmsTxt] ${pagePath} is not valid MDX, so it is left out of llms.txt`
          );
          continue;
        }
        const fields = [...new Set(options.frontmatterFields)].flatMap(key => {
          if (RESERVED_FIELDS.has(key) || !/^[A-Za-z_][\w-]*$/.test(key)) return [];
          const value = yamlValue((page as unknown as Record<string, unknown>)[key]);
          return value === undefined ? [] : [[key, value] as [string, string]];
        });
        markdownPages[page.route] = {
          title,
          description,
          // Typed as a `Date`, but sources also set timestamps and date strings.
          lastModified: isoDate(page.lastModified as unknown),
          ...(fields.length > 0 && { fields }),
          markdown: body
        };
      } catch (error) {
        failures.push(`${pagePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    config.setData({ markdownPages, llmsRouteClaims });
    if (failures.length > 0) {
      throw new PluginError(
        `Couldn't convert ${failures.length} page(s) to Markdown:\n${failures.join('\n')}`
      );
    }
  },

  async afterUpdate(_, { sharedFilesystem, globalConfig }, options = {}) {
    await publish(sharedFilesystem, globalConfig, options);
  },

  async afterSourceRemove(sharedFilesystem, { globalConfig }, options = {}) {
    await publish(sharedFilesystem, globalConfig, options);
  }
};

async function publish(
  sharedFilesystem: IVolumeMutable,
  globalConfig: ImmutableData<LlmsTxtPluginData>,
  options: LlmsTxtPluginOptions
) {
  const scopes = normalizeScopes(options.scopes);
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  const publish = (writes.get(sharedFilesystem) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const sourcePages = globalConfig.data.markdownPages ?? {};
      const claims = new Map<string, number>();
      const normalizeRoute = (route: string) => (route === '/' ? route : route.replace(/\/+$/, ''));
      for (const route of globalConfig.data.llmsRouteClaims ?? []) {
        const key = normalizeRoute(route).toLowerCase();
        claims.set(key, (claims.get(key) ?? 0) + 1);
      }
      const pages: Record<string, MarkdownPage> = {};
      for (const [authoredRoute, page] of Object.entries(sourcePages)) {
        const route = normalizeRoute(authoredRoute);
        // Ambiguous canonical routes cannot safely identify public content.
        if ((claims.get(route.toLowerCase()) ?? 0) > 1) continue;
        pages[route] = {
          ...page,
          markdown: renderPage(
            { route, ...page },
            page.markdown,
            siteUrl,
            mostSpecificScope(route, scopes)
          )
        };
      }
      const routes = Object.keys(pages).sort(compareRoutes);
      const previous: LlmsManifest | undefined = (await sharedFilesystem.promises.exists(
        LLMS_MANIFEST_FILE
      ))
        ? JSON.parse(String(await sharedFilesystem.promises.readFile(LLMS_MANIFEST_FILE)))
        : undefined;
      const previousScopes = normalizeScopes(
        (previous?.scopes ?? []).map(scope => ({ path: scope }))
      );
      const file: MarkdownPagesFile = {
        version: 1,
        pages: Object.fromEntries(routes.map(route => [route, pages[route].markdown]))
      };
      await sharedFilesystem.promises.writeFile(MARKDOWN_PAGES_FILE, JSON.stringify(file));
      await sharedFilesystem.promises.writeFile(
        LLMS_FULL_TXT_FILE,
        routes.map(route => pages[route].markdown).join('\n')
      );
      await sharedFilesystem.promises.writeFile(
        LLMS_TXT_FILE,
        buildLlmsTxt(pages, { ...options, siteUrl })
      );
      for (const scope of scopes) {
        const scopedRoutes = routes.filter(route => withinScope(route, scope.path));
        const scopedPages = Object.fromEntries(scopedRoutes.map(route => [route, pages[route]]));
        await sharedFilesystem.promises.mkdir(scope.path, { recursive: true });
        await sharedFilesystem.promises.writeFile(
          `${scope.path}${LLMS_TXT_FILE}`,
          buildLlmsTxt(scopedPages, {
            title: scope.title ?? scope.path,
            description: scope.description,
            siteUrl
          })
        );
        await sharedFilesystem.promises.writeFile(
          `${scope.path}${LLMS_FULL_TXT_FILE}`,
          scopedRoutes.map(route => pages[route].markdown).join('\n')
        );
      }
      for (const previousScope of previousScopes) {
        if (scopes.some(scope => scope.path === previousScope.path)) continue;
        for (const file of [LLMS_TXT_FILE, LLMS_FULL_TXT_FILE]) {
          const target = `${previousScope.path}${file}`;
          if (await sharedFilesystem.promises.exists(target))
            await sharedFilesystem.promises.unlink(target);
        }
      }
      const manifest: LlmsManifest = {
        version: 1,
        routes,
        scopes: scopes.map(scope => scope.path),
        ...(siteUrl && { siteUrl })
      };
      await sharedFilesystem.promises.writeFile(LLMS_MANIFEST_FILE, JSON.stringify(manifest));
    });
  writes.set(sharedFilesystem, publish);
  try {
    await publish;
  } finally {
    if (writes.get(sharedFilesystem) === publish) writes.delete(sharedFilesystem);
  }
}

export default LlmsTxtPlugin;
