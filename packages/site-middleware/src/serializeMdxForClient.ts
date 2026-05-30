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
import { serialize, type SerializeResult } from 'next-mdx-remote-client/serialize';
import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

import { codeBlocks } from './plugins/codeBlocks.js';

if (typeof window !== 'undefined') {
  throw new Error('serializeMdxForClient.ts must not be imported on the client.');
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
  const { rehypePlugins = [], remarkPlugins = [], parseFrontmatter = true, scope } = options;

  const result = await serialize<TFrontmatter>({
    source,
    options: {
      parseFrontmatter,
      scope,
      mdxOptions: {
        // `codeBlocks` runs first so its transformation is visible to
        // slug generation.
        rehypePlugins: [codeBlocks as any, rehypeSlug as any, ...rehypePlugins],
        remarkPlugins: [remarkGfm as any, ...remarkPlugins]
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
        remarkPlugins: [remarkGfm as any, ...remarkPlugins],
        rehypePlugins: [codeBlocks as any, rehypeSlug as any, ...rehypePlugins]
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

  return result;
}
