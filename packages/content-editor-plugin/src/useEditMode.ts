'use client';

/**
 * URL-driven edit-mode toggle.
 *
 * `?edit=1` on the URL ⇒ EDIT mode; absent ⇒ VIEW mode. The hook
 * exposes the current boolean plus two stable callbacks to flip it
 * via `router.replace` (no history entry — the back button keeps its
 * natural meaning).
 *
 * `stopEditing` is also the cancel-out for CREATE mode (`?new=1`).
 * In that case it strips the create flags and navigates to the
 * parent folder, because the synthesised create-route doesn't exist
 * on disk and staying would 404. See the callback for details.
 *
 * Replaces the previous global `pageState` field on the zustand
 * store. The URL is the source of truth so the mode survives reload,
 * is shareable, can be auth-gated server-side, and removes the
 * pathname-watcher effect that used to clean up on navigation.
 *
 * Implementation note: only `isEditing` subscribes to
 * `useSearchParams` (it has to — it's derived state). The writers
 * read `window.location.search` on demand so toggling the URL
 * doesn't re-create the callbacks and force consumers to re-render
 * (rule `rerender-defer-reads`).
 */
import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface EditMode {
  /** `true` when `?edit=1` is on the current URL. */
  isEditing: boolean;
  /** Add `?edit=1` to the current URL via `router.replace`. */
  startEditing: () => void;
  /** Remove `?edit=1` from the current URL via `router.replace`. */
  stopEditing: () => void;
}

export function useEditMode(): EditMode {
  const router = useRouter();
  const pathname = usePathname();
  const isEditing = useSearchParams().get('edit') === '1';

  const startEditing = useCallback(() => {
    // Read the live query string at click-time rather than capturing
    // a closure over `useSearchParams()`'s return value — keeps the
    // callback's identity stable across renders.
    const params = new URLSearchParams(window.location.search);
    params.set('edit', '1');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router]);

  const stopEditing = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    // In CREATE mode the URL carries `?new=1&title=...` rather than
    // `?edit=1` — stripping only `edit` would leave the create
    // branch in `[...route]/page.tsx` active, the editor would
    // stay mounted, and the click would appear to do nothing.
    // Strip all three flags so a single Cancel handler works for
    // both modes. `title` is meaningless without `new`, so it goes
    // too (otherwise back/forward through history would leak stale
    // titles into refreshes). `existed` is the marker the server
    // adds when a `?new=1` request hit an existing route; once the
    // author cancels out of edit mode the hint is stale.
    const wasCreating = params.get('new') === '1';
    params.delete('edit');
    params.delete('new');
    params.delete('title');
    params.delete('existed');
    const qs = params.toString();

    // The create branch was rendering a synthesised page for a
    // route that does NOT exist on disk; staying on `pathname`
    // would 404. Navigate to the parent folder instead — that's
    // where the author was browsing when they hit "New Page", so
    // it's the closest analogue to "undo". Falls back to `/` when
    // we're at the top level (parent of `/foo` is `/`).
    //
    // Edit mode never has this problem — `pathname` is always a
    // real on-disk route — so we keep the old behaviour there.
    const target = wasCreating
      ? (pathname.replace(/\/[^/]*$/, '') || '/') + (qs ? `?${qs}` : '')
      : qs
      ? `${pathname}?${qs}`
      : pathname;
    router.replace(target, { scroll: false });
  }, [pathname, router]);

  return { isEditing, startEditing, stopEditing };
}
