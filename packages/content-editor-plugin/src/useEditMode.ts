'use client';

/**
 * URL-driven edit-mode toggle.
 *
 * `?edit=1` on the URL ⇒ EDIT mode; absent ⇒ VIEW mode. The hook
 * exposes the current boolean plus two stable callbacks to flip it
 * via `router.replace` (no history entry — the back button keeps its
 * natural meaning).
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
    params.delete('edit');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router]);

  return { isEditing, startEditing, stopEditing };
}
