/**
 * Serves the site's docs as Markdown for agents, from the files
 * `LlmsTxtPlugin` writes:
 *
 *   // app/api/llms/[...path]/route.ts
 *   export const GET = createLlmsHandler();
 *
 * - `/api/llms/llms.txt` and `/api/llms/llms-full.txt`: the files themselves;
 * - `/api/llms/<scope>/llms.txt` and `llms-full.txt`: configured scoped files;
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
import { createLlmsManifestLoader, isLlmsRoute, llmsDiscoveryForRoute } from './llmsDiscovery.js';

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
  if (
    file?.version !== 1 ||
    typeof file.pages !== 'object' ||
    file.pages === null ||
    Array.isArray(file.pages) ||
    Object.entries(file.pages).some(
      ([route, body]) => !isLlmsRoute(route) || typeof body !== 'string'
    )
  ) {
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
  const cacheOptions = { maxAge, staleWhileRevalidate: false };
  const getPages = createContentFileCache(MARKDOWN_PAGES_FILE, parseMarkdownPages, cacheOptions);
  const getManifest = createLlmsManifestLoader(maxAge);
  const getTextFile = new Map(
    LLMS_TXT_FILES.map(file => [
      file as string,
      createContentFileCache(file, value => value, cacheOptions)
    ])
  );

  return async function GET(
    _request: Request,
    context: { params: Promise<{ path?: string[] }> }
  ): Promise<Response> {
    const segments = (await context.params).path ?? [];
    if (
      !segments.length ||
      !isLlmsRoute(`/${segments.join('/')}`) ||
      segments.some(segment => segment.includes('/'))
    )
      return text('Not found', 404);
    const resolved = resolveMosaicMode();
    const mode = modeOption ?? resolved.mode;
    const contentUrl = contentUrlOption ?? resolved.contentUrl;
    // Snapshot content only changes with a deployment, so CDNs can keep it briefly.
    const cacheControl =
      mode === 'snapshot-file'
        ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
        : 'no-store';

    try {
      const file = segments.join('/').toLowerCase();
      if ((LLMS_TXT_FILES as readonly string[]).includes(segments.at(-1)!.toLowerCase())) {
        if (segments.length > 1) {
          const manifest = await getManifest(mode, contentUrl);
          const scope = `/${segments.slice(0, -1).join('/')}`.toLowerCase();
          // Bound cached nested files to the configured scopes in this generation.
          for (const cached of getTextFile.keys()) {
            const parent = `/${cached.slice(0, cached.lastIndexOf('/'))}`;
            if (cached.includes('/') && !manifest?.scopes.includes(parent))
              getTextFile.delete(cached);
          }
          if (!manifest?.scopes.includes(scope)) return text('Not found', 404);
        }
        if (!getTextFile.has(file))
          getTextFile.set(
            file,
            createContentFileCache(file, value => value, cacheOptions)
          );
        const textFile = getTextFile.get(file)!;
        const body = await textFile(mode, contentUrl);
        return body === undefined
          ? text('Not found', 404)
          : text(body, 200, { 'Cache-Control': cacheControl });
      }
      const route = routeOf(segments);
      const pages = await getPages(mode, contentUrl);
      const canonical = pages?.has(route) ? route : `${route}/index`;
      const markdown =
        route.endsWith('/index') && canonical !== route ? undefined : pages?.get(canonical);
      if (markdown === undefined) {
        return text('Not found', 404);
      }
      const manifest = await getManifest(mode, contentUrl);
      if (manifest && !manifest.routes.includes(canonical)) return text('Not found', 404);
      const discovery = llmsDiscoveryForRoute(canonical, manifest);
      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': cacheControl,
          // The same URL serves HTML unless the request accepts Markdown.
          Vary: 'Accept',
          // The HTML page is the one to index.
          'X-Robots-Tag': 'noindex',
          Link: `<${discovery.markdownUrl}>; rel="alternate"; type="text/markdown", <${discovery.indexUrl}>; rel="describedby"`
        }
      });
    } catch (error) {
      console.error(`[Mosaic] Couldn't load the Markdown files: ${error}`);
      return text('Markdown is unavailable', 503);
    }
  };
}
