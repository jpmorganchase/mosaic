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

import { auth } from '../../auth';

export async function compilePreview(markdown: string): Promise<SerializeResult> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  // `serializeMdxForClient` returns `{ compiledSource, frontmatter,
  // scope }` on success or `{ error, frontmatter, scope }` on
  // failure; the editor's preview component renders both shapes.
  return serializeMdxForClient(markdown);
}


