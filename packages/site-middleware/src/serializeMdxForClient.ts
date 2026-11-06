/**
 * App Router MDX pipeline.
 *
 * Serialises an MDX string on the server into a compiled-source payload
 * that can be shipped across the RSC boundary as plain JSON and rendered
 * on the client with `<MDXClient />`.
 *
 * Why not render MDX entirely on the server? Most MDX components (Salt,
 * Mosaic UI, ...) use React hooks but ship without a `'use client'`
 * directive in their dist bundles, which trips Turbopack's RSC rules.
 * Serialising on the server and letting the client supply components from
 * its own module graph side-steps that without any client-boundary plumbing.
 *
 * Server-only — importing this from a client component throws.
 */
import { createHash } from 'node:crypto';
import { serialize, type SerializeResult } from 'next-mdx-remote-client/serialize';
import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

import { codeBlocks } from './plugins/codeBlocks.js';
import {
  highlightCodeBlocks,
  type HighlightCodeBlocksOptions
} from './plugins/highlightCodeBlocks.js';

if (typeof window !== 'undefined') {
  throw new Error('serializeMdxForClient.ts must not be imported on the client.');
}

/**
 * Successful compiles for the default pipeline, keyed by a hash of the
 * source. Compiling (MDX + shiki) is the most expensive step of a page
 * render and is deterministic for a given source, so identical pages —
 * every re-visit in active mode, every editor preview of unchanged
 * text — reuse the result. Bounded LRU: `Map` keeps insertion order.
 */
const COMPILE_CACHE_MAX_ENTRIES = 200;
const compileCache = new Map<string, SerializeResult>();

function readCompileCache(key: string): SerializeResult | undefined {
  const hit = compileCache.get(key);
  if (hit) {
    compileCache.delete(key);
    compileCache.set(key, hit);
  }
  return hit;
}

function writeCompileCache(key: string, result: SerializeResult) {
  compileCache.set(key, result);
  if (compileCache.size > COMPILE_CACHE_MAX_ENTRIES) {
    compileCache.delete(compileCache.keys().next().value as string);
  }
}

export interface SerializeMdxForClientOptions {
  rehypePlugins?: any[];
  remarkPlugins?: any[];
  parseFrontmatter?: boolean;
  /**
   * Variables made available in the MDX evaluation scope on the client.
   * Must be JSON-serialisable — functions / class instances are dropped
   * when the RSC payload is serialised. Mosaic content commonly
   * references `{meta.*}` (frontmatter) here.
   */
  scope?: Record<string, unknown>;
  /**
   * Server-side syntax highlighting via shiki. Default `true`.
   *
   * When enabled, each `<pre><code class="language-…">` fence is
   * highlighted by `highlightCodeBlocks` and the result attached as
   * a `data-mosaic-html` attribute on the `<code>`. The client
   * `<Pre>` reads that and skips its `await import('shiki')` —
   * saving ~150 KB of shiki + grammars per docs page.
   *
   * Pass `false` to disable, or an options object to customise
   * languages / themes (see `HighlightCodeBlocksOptions`). Hosts
   * without a highlighter component ignore the extra attributes
   * harmlessly.
   */
  highlight?: boolean | HighlightCodeBlocksOptions;
}

/**
 * Compile an MDX string on the server, returning a JSON-serialisable
 * payload ready to hand to `<MDXClient />`.
 *
 * Errors during compilation are returned on `result.error` (already
 * serialised by `next-mdx-remote-client`) rather than thrown, so the
 * caller can decide whether to surface them as a 500 or render an
 * inline error component.
 */
export async function serializeMdxForClient<
  TFrontmatter extends Record<string, unknown> = Record<string, unknown>
>(
  source: string,
  options: SerializeMdxForClientOptions = {}
): Promise<SerializeResult<TFrontmatter>> {
  const {
    rehypePlugins = [],
    remarkPlugins = [],
    parseFrontmatter = true,
    scope,
    highlight = true
  } = options;

  // Only the default pipeline is cacheable: custom plugins and scope
  // values can't be keyed reliably. Treat the result as read-only.
  const cacheKey =
    rehypePlugins.length === 0 &&
    remarkPlugins.length === 0 &&
    scope === undefined &&
    typeof highlight === 'boolean'
      ? createHash('sha256')
          .update(`${parseFrontmatter}\u0000${highlight}\u0000${source}`)
          .digest('hex')
      : undefined;
  if (cacheKey) {
    const cached = readCompileCache(cacheKey);
    if (cached) return cached as SerializeResult<TFrontmatter>;
  }

  // Built once and reused by both the primary `serialize` and the
  // error-recovery re-`compile` so they walk identical plugin chains.
  const highlightPlugin =
    highlight === false
      ? undefined
      : highlightCodeBlocks(typeof highlight === 'object' ? highlight : {});

  const baseRehypePlugins = [
    codeBlocks as any,
    ...(highlightPlugin ? [highlightPlugin as any] : []),
    rehypeSlug as any,
    ...rehypePlugins
  ];
  const baseRemarkPlugins = [remarkGfm as any, ...remarkPlugins];

  const result = await serialize<TFrontmatter>({
    source,
    options: {
      parseFrontmatter,
      scope,
      mdxOptions: {
        rehypePlugins: baseRehypePlugins,
        remarkPlugins: baseRemarkPlugins
      }
    }
  });

  // Mosaic MDX content commonly references `{meta.*}` (an alias for the
  // parsed frontmatter) — see e.g. `# {meta.title}` across docs/. Inject
  // it here so callers don't have to remember. Only attach if no
  // scope.meta was explicitly provided by the caller.
  if ('frontmatter' in result && result.frontmatter) {
    const existingScope = (result as { scope?: Record<string, unknown> }).scope ?? {};
    (result as { scope?: Record<string, unknown> }).scope = {
      ...existingScope,
      meta: 'meta' in existingScope ? existingScope.meta : result.frontmatter
    };
  }

  // `next-mdx-remote-client` wraps the underlying MDX compile error in
  // a plain `Error`, which loses the structured `line` / `column` /
  // `place` that the original `VFileMessage` carried. That metadata is
  // essential for the editor's "jump to error" affordance, so when we
  // see an error, re-run the bare `@mdx-js/mdx` compiler on the same
  // source to recover the position and attach it to the returned
  // error.
  //
  // Cost: a second compile *only* on error. Errors are rare relative
  // to keystrokes; the duplicate is well worth the precise location.
  if ('error' in result && result.error) {
    try {
      await compile(source, {
        remarkPlugins: baseRemarkPlugins,
        rehypePlugins: baseRehypePlugins
      });
    } catch (locationProbe) {
      const probe = locationProbe as {
        line?: number;
        column?: number;
        place?: { line?: number; column?: number };
        reason?: string;
      };
      // Attach as own enumerable properties so they survive the RSC
      // serialisation boundary (class-instance fields and getters do
      // not).
      const err = result.error as Error & {
        line?: number;
        column?: number;
        place?: { line?: number; column?: number };
        reason?: string;
      };
      if (typeof probe.line === 'number') err.line = probe.line;
      if (typeof probe.column === 'number') err.column = probe.column;
      if (probe.place && typeof probe.place === 'object') {
        err.place = { line: probe.place.line, column: probe.place.column };
      }
      if (typeof probe.reason === 'string') err.reason = probe.reason;
    }
  }

  if (cacheKey && !('error' in result && result.error)) {
    writeCompileCache(cacheKey, result as SerializeResult);
  }

  return result;
}
