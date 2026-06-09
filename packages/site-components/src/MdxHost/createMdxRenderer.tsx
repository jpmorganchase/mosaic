'use client';

/**
 * Host-configurable MDX renderer factory.
 *
 * The Mosaic App-Router pipeline serialises MDX on the server with
 * `serializeMdxForClient` and ships a JSON-safe
 * `{ compiledSource, frontmatter, scope }` payload across the RSC
 * boundary. The rendering step (`<MDXClient />`) must run in the
 * client graph so Salt-DS / Mosaic UI components stay where their
 * hooks are legal.
 *
 * Each *host* (a concrete Next.js app: `packages/site`, the JPMC
 * `developer-site`, the `salt-ds/site` docs) used to maintain its own
 * 30-line copy of this renderer with slightly different scope-merge
 * rules. `createMdxRenderer` is the canonical replacement: hosts call
 * it once with their bespoke component registry and any extra scope
 * values, and use the returned component from `BodyServer.tsx`.
 *
 *   // host: app/[...route]/mdxHost.ts (or MdxComponents.ts)
 *   'use client';
 *   import { createMdxRenderer } from '@jpmorganchase/mosaic-site-components';
 *   import { Salt, Sitemap, MyLocalThing } from './...';
 *   export const MdxRenderer = createMdxRenderer({
 *     components: { Salt, Sitemap, MyLocalThing },
 *   });
 *
 *   // host: app/[...route]/BodyServer.tsx
 *   import { MdxRenderer } from './mdxHost';
 *   // ...await serializeMdxForClient(raw); <MdxRenderer source={source} />
 *
 * Why a factory instead of a `<MdxHostProvider>` context: the host's
 * config is static module-scope data, not something that varies per
 * subtree. A factory keeps the wiring linear, avoids the
 * "forgot-to-mount-the-provider → empty registry → blank render" class
 * of bug, and makes host config statically traceable from
 * `BodyServer.tsx`.
 *
 * Merge precedence (lowest → highest, so later wins):
 *   1. Mosaic default components from `mdxComponents` (i.e. the export
 *      from `./mdx.tsx` — `getMarkdownComponents()` + `Home` +
 *      `OpenAPI`).
 *   2. `host.components` — host-supplied overrides / extensions.
 *   3. Per-page server scope from `serializeMdxForClient`
 *      (notably `meta`, plus anything the caller passed in
 *      `options.scope`).
 * Scope merging follows the same order, with `createMDXScope(meta)`
 * supplying the default `helpers` / `recipes` / `hooks` /  `meta`
 * surface before host and server scope override.
 */
import { MDXClient } from 'next-mdx-remote-client';
import type { MDXComponents } from 'next-mdx-remote-client';
import type { SerializeResult } from 'next-mdx-remote-client/serialize';

import mosaicDefaultComponents from '../mdx';
import { createMDXScope } from '../utils/createMDXScope';

export interface CreateMdxRendererOptions {
  /**
   * Components merged on top of Mosaic's default markdown registry.
   * Host wins on key collisions. Typical entries: `Salt`, `Sitemap`,
   * any local components used inside the host's MDX content.
   */
  components?: Record<string, unknown>;
  /**
   * Extra MDX evaluation-scope values. Merged on top of the default
   * `createMDXScope(meta)` output; the per-page server scope
   * (`source.scope`, includes `meta` injected by
   * `serializeMdxForClient`) wins over both.
   *
   * Use this for host-specific scope variables. Note: functions and
   * hook references are fine here because everything lives in the
   * client bundle — the scope only has to be JSON-serialisable on the
   * *server* side (i.e. in `serializeMdxForClient`'s `options.scope`).
   */
  scope?: Record<string, unknown>;
}

export interface MdxRendererProps {
  source: SerializeResult;
}

export function createMdxRenderer(
  options: CreateMdxRendererOptions = {}
): React.FC<MdxRendererProps> {
  const { components: hostComponents = {}, scope: hostScope = {} } = options;

  // Pre-compute the merged components object — it never changes across
  // renders. The per-page scope still has to be computed on each
  // render because `meta` is per-page.
  const mergedComponents = {
    ...(mosaicDefaultComponents as Record<string, unknown>),
    ...hostComponents
  } as unknown as MDXComponents;

  function MdxRenderer({ source }: MdxRendererProps) {
    if ('error' in source && source.error) {
      // Re-throw so the nearest `error.tsx` catches it with full
      // context (including the `line` / `column` / `place` metadata
      // `serializeMdxForClient` attaches on compile failures).
      throw source.error;
    }
    const { compiledSource } = source as Extract<typeof source, { compiledSource: string }>;

    // Server scope wins on key collisions: the page's `meta` (auto-
    // injected by `serializeMdxForClient`) and any caller-passed
    // `options.scope` represent the most specific intent.
    const serverScope = (source.scope ?? {}) as Record<string, unknown>;
    const defaultClientScope = createMDXScope(
      (serverScope.meta as Record<string, unknown> | undefined) ?? {}
    );
    const scope = {
      ...defaultClientScope,
      ...hostScope,
      ...serverScope
    };

    return (
      <MDXClient
        compiledSource={compiledSource}
        frontmatter={source.frontmatter}
        scope={scope}
        components={mergedComponents}
      />
    );
  }
  MdxRenderer.displayName = 'MdxRenderer';
  return MdxRenderer;
}
