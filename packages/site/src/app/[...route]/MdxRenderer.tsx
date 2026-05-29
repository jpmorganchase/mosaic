'use client';

/**
 * Client-side MDX renderer.
 *
 * Architecture:
 *   - The server compiles MDX with `serializeMdxForClient` and ships the
 *     resulting `{ compiledSource, frontmatter, scope }` payload to the
 *     browser as plain JSON (RSC-safe — no React elements crossing the
 *     boundary).
 *   - This client component picks the payload up and renders it via
 *     `next-mdx-remote-client`'s `<MDXClient />`. The MDX component
 *     registry (`mdxComponents`) is imported locally, so the
 *     Salt-DS / Mosaic UI / Sitemap components live in the client graph
 *     where they belong — no `'use client'` shims, no client-reference
 *     proxy gymnastics in the server graph.
 *
 * `<MDXClient />` itself uses *no* React hooks (it just evaluates the
 * compiled function and wraps the output with `<MDXProvider>`), so it
 * doesn't bring back the `useState` hazard the legacy `next-mdx-remote`
 * `<MDXRemote lazy />` introduced.
 */
import { MDXClient } from 'next-mdx-remote-client';
import type { SerializeResult } from 'next-mdx-remote-client/serialize';

import { mdxComponents } from './MdxComponents';

interface MdxRendererProps {
  source: SerializeResult;
}

export function MdxRenderer({ source }: MdxRendererProps) {
  if ('error' in source && source.error) {
    // Re-throw so the nearest `error.tsx` catches it.
    throw source.error;
  }
  // Narrowed: the success branch always has `compiledSource`.
  const { compiledSource } = source as Extract<typeof source, { compiledSource: string }>;
  return (
    <MDXClient
      compiledSource={compiledSource}
      frontmatter={source.frontmatter}
      scope={source.scope}
      components={mdxComponents as unknown as Record<string, React.ComponentType<any>>}
    />
  );
}
