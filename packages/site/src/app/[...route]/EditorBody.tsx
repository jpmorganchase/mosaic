'use client';

/**
 * Lexical-based content editor mounted in place of the rendered MDX
 * body when `pageState === 'EDIT'`. Loaded lazily via `next/dynamic`
 * from `<BodySwitcher>` so its Lexical / `next-mdx-remote-client`
 * footprint doesn't burden VIEW renders.
 *
 * Wiring:
 *   - `previewUrl="/api/content/preview"` — the editor POSTs the
 *     current markdown on every (debounced) keystroke and stores the
 *     compiled `{ compiledSource, frontmatter, scope }` result.
 *   - `PreviewComponent` — receives that compiled payload and renders
 *     it with `<MDXClient />`, using the same component registry as
 *     the production `<MdxRenderer />` so previewed pages look
 *     identical to published ones.
 *   - `persistUrl` — any truthy value enables the "Raise PR" button
 *     in `<PersistEditDialog />`. The actual save transport is the
 *     workflows websocket (`NEXT_PUBLIC_MOSAIC_WORKFLOWS_URL`), not
 *     an HTTP POST to this URL.
 */
import { ComponentType, useMemo } from 'react';
import { MDXClient } from 'next-mdx-remote-client';
import type { SerializeResult } from 'next-mdx-remote-client/serialize';
import { Editor } from '@jpmorganchase/mosaic-content-editor-plugin';

interface PreviewProps {
  source: SerializeResult;
  components: Record<string, ComponentType<unknown>>;
}

/**
 * Adapter that bridges the editor's `PreviewComponent` contract
 * (`{ source, components, meta }`) to `<MDXClient />`'s expected
 * `{ compiledSource, frontmatter, scope, components }` props.
 */
function EditorPreview({ source, components }: PreviewProps) {
  if (!source) return null;
  if ('error' in source && source.error) {
    return <pre>{String(source.error)}</pre>;
  }
  const { compiledSource } = source as Extract<typeof source, { compiledSource: string }>;
  return (
    <MDXClient
      compiledSource={compiledSource}
      frontmatter={source.frontmatter}
      scope={source.scope}
      components={components as Record<string, ComponentType<unknown>>}
    />
  );
}

interface EditorBodyProps {
  content: string;
  components: Record<string, unknown>;
  PreviewComponent: ComponentType<{ source: SerializeResult }>;
  user?: { sid: string; displayName: string; email: string };
}

export function EditorBody({ content, components, user }: EditorBodyProps) {
  // `Editor`'s prop types are loose (`any`) for `source` / `meta` /
  // `components`. Memoise the components object so the editor's
  // internal effects aren't reset on every parent render.
  const stableComponents = useMemo(() => components, [components]);
  return (
    <Editor
      content={content}
      components={stableComponents}
      source={undefined}
      PreviewComponent={EditorPreview as ComponentType<{ source: unknown; components: unknown }>}
      previewUrl="/api/content/preview"
      persistUrl="/api/content/persist"
      user={user}
    />
  );
}

