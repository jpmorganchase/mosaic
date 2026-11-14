'use server';

/**
 * Server Action invoked by the editor on every (debounced) keystroke
 * to compile the current markdown to a renderer-ready payload.
 *
 * Replaces the legacy `POST /api/content/preview` route handler — same
 * MDX compile pipeline, but called directly from the client via an
 * action reference, and using the same `serializeMdxForClient`
 * function the production page body uses. One MDX pipeline instead
 * of two.
 *
 * Auth: Server Actions are exposed as public endpoints; the editor
 * page itself is auth-gated in `page.tsx` but a hostile client can
 * invoke this action directly. We require a logged-in session so
 * unauthenticated callers can't burn server CPU on MDX compilation.
 */
import { serializeMdxForClient } from '@jpmorganchase/mosaic-site-middleware';
import type { SerializeResult } from 'next-mdx-remote-client/serialize';

import { auth, isAuthorizedEditor } from '../../../auth';
import { MAX_FRONTMATTER_BYTES, MAX_MARKDOWN_BYTES } from '../../../lib/editorLimits';

// The preview compiles the whole draft, frontmatter included.
const MAX_PREVIEW_BYTES = MAX_MARKDOWN_BYTES + MAX_FRONTMATTER_BYTES;

export async function compilePreview(markdown: string): Promise<SerializeResult> {
  const session = await auth();
  if (!session?.user || !isAuthorizedEditor(session.user)) {
    throw new Error('Unauthorized');
  }
  if (typeof markdown !== 'string') {
    throw new Error('Invalid markdown');
  }
  // A save of this size would be rejected too, so don't spend CPU
  // compiling it on every keystroke.
  if (Buffer.byteLength(markdown, 'utf8') > MAX_PREVIEW_BYTES) {
    throw new Error('Page is too large to preview');
  }
  // `serializeMdxForClient` returns `{ compiledSource, frontmatter,
  // scope }` on success or `{ error, frontmatter, scope }` on
  // failure; the editor's preview component renders both shapes.
  return serializeMdxForClient(markdown);
}
