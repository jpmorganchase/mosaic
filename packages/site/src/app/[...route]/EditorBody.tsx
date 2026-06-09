'use client';

/**
 * Lexical-based content editor rendered in place of the MDX body
 * when `?edit=1` (or `?new=1`) is on the URL.
 *
 * Loaded lazily via `next/dynamic` from `page.tsx` so its JS chunk
 * — Lexical, the editor plugins, MDX preview wiring, etc. — is only
 * fetched on the EDIT/CREATE branches. VIEW-mode visitors never
 * download it.
 *
 * Both Server Actions are passed in as props (rather than imported
 * inside the editor plugin) so the plugin stays decoupled from this
 * specific Next app. `EditorPreview` adapts the editor's
 * `PreviewComponent` contract to `<MDXClient />`, reusing the same
 * MDX component registry as the production page render.
 */
import { ComponentType } from 'react';
import { MDXClient } from 'next-mdx-remote-client';
import type { SerializeResult } from 'next-mdx-remote-client/serialize';
import { Editor, type EditorUser } from '@jpmorganchase/mosaic-content-editor-plugin';
import type { MdxRawSourceResult } from '@jpmorganchase/mosaic-site-middleware';

import { mdxComponents } from './MdxComponents';
import { compilePreview } from './previewAction';
import { persistContent } from './persistAction';

interface PreviewProps {
  source: SerializeResult | undefined;
  components: Record<string, ComponentType<unknown>>;
}

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

export interface EditorBodyProps {
  raw: string;
  /**
   * Result of the parallel `getMdxRawSource` call in
   * `page.tsx` — the page's bytes **before** Mosaic's plugin
   * pipeline ran. Wired through to `<Editor>` as the data
   * source for the Frontmatter tab (and, in a later step, the
   * authored-frontmatter slice of the save payload).
   *
   * Optional / discriminated so an integration that doesn't
   * yet plumb it through, or a route whose source kind doesn't
   * support raw fetches (`unsupported-source`,
   * `unavailable-in-mode`, …) can pass `undefined` or the
   * matching kind without breaking the editor — the editor
   * degrades to the read-only Frontmatter viewer in those
   * cases.
   */
  rawSource?: MdxRawSourceResult;
  user?: EditorUser;
  /**
   * Forwarded to `<Editor>` so the save dialog switches to
   * create-page wording and the persist payload carries
   * `isNewPage: true`. Defaults to `false`.
   */
  isNewPage?: boolean;
}

export function EditorBody({ raw, rawSource, user, isNewPage = false }: EditorBodyProps) {
  return (
    <div className="wrapper">
      <Editor
        content={raw}
        rawSource={rawSource}
        components={mdxComponents}
        PreviewComponent={
          EditorPreview as ComponentType<{
            source: SerializeResult | undefined;
            components: Record<string, unknown>;
          }>
        }
        compilePreview={compilePreview}
        persist={persistContent}
        user={user}
        isNewPage={isNewPage}
      />
    </div>
  );
}
