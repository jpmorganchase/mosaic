'use client';

/**
 * Editor view-mode toggle (`?mode=source` vs. WYSIWYG).
 *
 * Mirrors the pattern of {@link ./useEditMode}: the URL is the
 * source of truth for the mode so it survives reload, can be
 * shared, can be set via a deep-link, and doesn't require a
 * separate persistence layer.
 *
 * Default mode is `'wysiwyg'` (no `mode` parameter). Setting
 * `?mode=source` opts in to the raw-markdown textarea;
 * `?mode=frontmatter` opens the read-only frontmatter viewer.
 * Any other value collapses to `'wysiwyg'` so a typo doesn't
 * leave the user on a broken value.
 *
 * The writers operate on the live `window.location.search` rather
 * than on `useSearchParams()`'s captured value so the callbacks
 * keep stable identities across renders — same trick `useEditMode`
 * uses, same reasoning (rule `rerender-defer-reads`).
 */
import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type EditorMode = 'wysiwyg' | 'source' | 'frontmatter';

export interface EditorModeApi {
  /** Current mode, derived from the URL. */
  mode: EditorMode;
  /** Switch to the given mode via `router.replace` (no history push). */
  setMode: (mode: EditorMode) => void;
}

export function useEditorMode(): EditorModeApi {
  const router = useRouter();
  const pathname = usePathname();
  const raw = useSearchParams().get('mode');
  const mode: EditorMode =
    raw === 'source' ? 'source' : raw === 'frontmatter' ? 'frontmatter' : 'wysiwyg';

  const setMode = useCallback(
    (next: EditorMode) => {
      const params = new URLSearchParams(window.location.search);
      if (next === 'source' || next === 'frontmatter') {
        params.set('mode', next);
      } else {
        // Default — drop the parameter rather than writing
        // `mode=wysiwyg` so the canonical edit URL stays
        // `?edit=1` for users who never touch the toggle.
        params.delete('mode');
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  return { mode, setMode };
}
