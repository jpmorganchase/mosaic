/**
 * Serves the site's docs as Markdown for agents, from the files
 * `LlmsTxtPlugin` writes:
 *
 *   // app/api/llms/[...path]/route.ts
 *   export const GET = createLlmsHandler();
 *
 * - `/api/llms/llms.txt` and `/api/llms/llms-full.txt`: the files themselves;
 * - `/api/llms/<route>`: the page at `<route>`, or at `<route>/index`.
 *
 * The site rewrites `/<route>.md`, `/llms.txt`, `/llms-full.txt` and
 * requests that accept `text/markdown` to it.
 *
 * Server-only.
 */
import type { MarkdownPagesFile, MosaicMode } from '@jpmorganchase/mosaic-types';

import { createContentFileCache } from './contentFiles.js';
import { resolveMosaicMode } from './loadSitemap.js';

export const MARKDOWN_PAGES_FILE = 'markdown-pages.json';
export const LLMS_TXT_FILES = ['llms.txt', 'llms-full.txt'] as const;

export interface LlmsHandlerOptions {
  /** Defaults to `MOSAIC_MODE`. */
  mode?: MosaicMode;
  /** Defaults to `MOSAIC_<MODE>_MODE_URL`. */
  contentUrl?: string;
  /**
   * Active mode: how long, in milliseconds, to serve the loaded files before
   * checking the content server for new ones. Defaults to 30 seconds.
   */
  maxAge?: number;
}

function parseMarkdownPages(text: string): Map<string, string> {
  const file = JSON.parse(text) as MarkdownPagesFile;
  if (file?.version !== 1 || typeof file.pages !== 'object' || file.pages === null) {
    throw new Error(`Unsupported ${MARKDOWN_PAGES_FILE} format`);
  }
  return new Map(Object.entries(file.pages));
}

const text = (body: string, status: number, headers: Record<string, string> = {}) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...headers }
  });

/** The route a request asks for: `/docs/button` for `docs/button.md`. */
function routeOf(segments: string[]) {
  const route = `/${segments.join('/')}`.replace(/\.md$/i, '').replace(/\/+$/, '');
  return route.toLowerCase();
}

/**
 * Creates a `GET` route handler for a catch-all route whose parameter is
 * `path`. Responds with Markdown, 404 when there's no such page or the site
 * has no Markdown files, and 503 when the files can't be loaded.
 */
export function createLlmsHandler(options: LlmsHandlerOptions = {}) {
  const { mode: modeOption, contentUrl: contentUrlOption, maxAge = 30_000 } = options;
  const getPages = createContentFileCache(MARKDOWN_PAGES_FILE, parseMarkdownPages, { maxAge });
  const getTextFile = Object.fromEntries(
    LLMS_TXT_FILES.map(file => [file, createContentFileCache(file, value => value, { maxAge })])
  );

  return async function GET(
    _request: Request,
    context: { params: Promise<{ path?: string[] }> }
  ): Promise<Response> {
    const segments = (await context.params).path ?? [];
    const resolved = resolveMosaicMode();
    const mode = modeOption ?? resolved.mode;
    const contentUrl = contentUrlOption ?? resolved.contentUrl;
    // Snapshot content only changes with a deployment, so CDNs can keep it briefly.
    const cacheControl =
      mode === 'snapshot-file'
        ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
        : 'no-store';

    const textFile = segments.length === 1 ? getTextFile[segments[0]] : undefined;
    try {
      if (textFile) {
        const body = await textFile(mode, contentUrl);
        return body === undefined
          ? text('Not found', 404)
          : text(body, 200, { 'Cache-Control': cacheControl });
      }
      const route = routeOf(segments);
      const pages = await getPages(mode, contentUrl);
      const markdown =
        pages?.get(route) ?? (route.endsWith('/index') ? undefined : pages?.get(`${route}/index`));
      if (markdown === undefined) {
        return text('Not found', 404);
      }
      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': cacheControl,
          // The same URL serves HTML unless the request accepts Markdown.
          Vary: 'Accept',
          // The HTML page is the one to index.
          'X-Robots-Tag': 'noindex'
        }
      });
    } catch (error) {
      console.error(`[Mosaic] Couldn't load the Markdown files: ${error}`);
      return text('Markdown is unavailable', 503);
    }
  };
}
