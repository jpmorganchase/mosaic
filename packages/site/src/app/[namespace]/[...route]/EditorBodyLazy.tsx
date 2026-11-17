'use client';

/**
 * Lazy client wrapper around `EditorBody`.
 *
 * `next/dynamic` only code-splits a Client Component when it is called
 * from a Client Component; called from the Server Component `page.tsx`
 * it does not split at all. Declaring it here keeps the Lexical editor
 * in its own chunk that only edit/create requests download.
 */
import dynamic from 'next/dynamic';

export const EditorBodyLazy = dynamic(() => import('./EditorBody').then(m => m.EditorBody));
