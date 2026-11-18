'use client';

/**
 * Asks the site whether new pages can be created in a folder, so the New
 * Page dialog can refuse a folder before the author is sent to a 404.
 *
 * The site answers through `createNewPageHandler` from
 * `@jpmorganchase/mosaic-site-middleware`, mounted at
 * `NEW_PAGE_CHECK_ENDPOINT`. A site without that route answers 404; the
 * folder is then `unknown` and the dialog doesn't block it, as before.
 */
import { useEffect, useRef, useState } from 'react';

export const NEW_PAGE_CHECK_ENDPOINT = '/api/content/new-page';

/** How long the folder must stay unchanged before it's checked, in ms. */
export const NEW_PAGE_CHECK_DELAY_MS = 250;

export type NewPageFolderStatus = 'checking' | 'writable' | 'read-only' | 'unknown';

/**
 * `folder` is a normalised absolute folder (`/docs/guides`, or `/`), or
 * `undefined` while the dialog has nothing valid to check. Results are
 * kept for the life of the dialog, so returning to a folder is instant.
 */
export function useNewPageFolderCheck(
  folder: string | undefined,
  enabled: boolean
): NewPageFolderStatus | undefined {
  const results = useRef(new Map<string, NewPageFolderStatus>());
  const [answer, setAnswer] = useState<{ folder: string; status: NewPageFolderStatus }>();

  useEffect(() => {
    if (!enabled || folder === undefined || results.current.has(folder)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`${NEW_PAGE_CHECK_ENDPOINT}?folder=${encodeURIComponent(folder)}`, {
        credentials: 'same-origin',
        signal: controller.signal
      })
        .then(async response => {
          if (!response.ok) return 'unknown';
          const body = (await response.json()) as { writable?: unknown };
          return typeof body.writable === 'boolean'
            ? body.writable
              ? 'writable'
              : 'read-only'
            : 'unknown';
        })
        .catch(() => (controller.signal.aborted ? undefined : 'unknown'))
        .then(status => {
          if (status === undefined) return;
          // Don't keep `unknown`: the site may answer next time.
          if (status !== 'unknown') results.current.set(folder, status);
          setAnswer({ folder, status });
        });
    }, NEW_PAGE_CHECK_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, folder]);

  if (!enabled || folder === undefined) return undefined;
  return results.current.get(folder) ?? (answer?.folder === folder ? answer.status : 'checking');
}
