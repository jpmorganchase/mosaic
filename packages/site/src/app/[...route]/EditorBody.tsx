'use client';

/**
 * Lexical-based content editor rendered in place of the MDX body
 * when `?edit=1` is on the URL. Code-split via `next/dynamic` in
 * `page.tsx` so its bundle is only fetched on the EDIT branch.
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
  user?: EditorUser;
}

export function EditorBody({ raw, user }: EditorBodyProps) {
  return (
    <div className="wrapper">
      <Editor
        content={raw}
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
      />
    </div>
  );
}



