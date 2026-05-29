'use client';

/**
 * View / Edit body switcher.
 *
 * The server renders the MDX body in the usual way and passes it down
 * as `children` (an RSC subtree). When the content-editor plugin's
 * shared store flips `pageState` to `'EDIT'` (via the "Edit Document"
 * action in `<AppHeaderControls />`) we swap that subtree for the
 * Lexical-based `<Editor />`, lazily loaded so its bundle is only
 * shipped to users who actually open the editor.
 *
 * Why pass `children` (the rendered MDX) instead of just `raw` and
 * re-rendering on the client:
 *   - VIEW mode keeps the existing server-side MDX compile path with
 *     zero extra client cost. Lexical, gray-matter, etc. stay code-
 *     split behind the dynamic import.
 *   - The MDX render and the editor preview share the same compiled
 *     output shape — preview uses `/api/content/preview` (server) to
 *     re-compile on each keystroke, identical to the boot-time render.
 *
 * SSR is disabled for the dynamic import: the Lexical composer touches
 * `document`/`window` in its initial-state setup and there is no
 * useful server output for "edit mode" anyway (a logged-out / first-
 * paint user is always in VIEW).
 */
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { usePageState } from '@jpmorganchase/mosaic-content-editor-plugin';

import { MdxRenderer } from './MdxRenderer';
import { mdxComponents } from './MdxComponents';

const EditorBody = dynamic(() => import('./EditorBody').then(m => m.EditorBody), {
  ssr: false,
  loading: () => <div className="wrapper">Loading editor…</div>
});

interface BodySwitcherProps {
  /** Raw MDX text — fed to `<Editor>` when editing. */
  raw: string;
  /** Already server-rendered MDX subtree — shown when viewing. */
  children: React.ReactNode;
}

export function BodySwitcher({ raw, children }: BodySwitcherProps) {
  const { pageState } = usePageState();
  const { data: session } = useSession();

  if (pageState === 'EDIT') {
    return (
      <EditorBody
        content={raw}
        components={mdxComponents}
        PreviewComponent={MdxRenderer}
        user={
          session?.user
            ? {
                sid: (session.user as { sid?: string }).sid ?? session.user.email ?? '',
                displayName: session.user.name ?? '',
                email: session.user.email ?? ''
              }
            : undefined
        }
      />
    );
  }

  return <>{children}</>;
}

