'use client';

/**
 * Lazily fetches `/sitemap.xml` and derives the unique set of
 * folder paths that exist across the site (e.g. `/docs`,
 * `/docs/configure`, `/docs/configure/sources`). Used by
 * `NewPageDialog`'s parent-folder ComboBox to give authors
 * discoverable suggestions without forcing them to choose from
 * the list — typing a brand-new path still works.
 *
 * Design notes:
 *   - `/sitemap.xml` is the only complete view of the namespace
 *     tree (the sidebar is per-route). It's emitted by every
 *     Mosaic deployment and excluded from page handling, so this
 *     is a stable contract.
 *   - We do NOT pull in `d3` like `SitemapTree` does; this hook
 *     only needs URLs, parsed with the platform `DOMParser`.
 *   - Fetch is fire-once per dialog mount (`enabled` gates it
 *     until the dialog opens) and cached on the hook's state, so
 *     re-opening the dialog within the same session is free.
 *   - Fail-soft: a network or parse error yields an empty
 *     suggestion list, so the ComboBox degrades to behaving like
 *     the original free-text Input rather than blocking the
 *     create flow.
 */
import { useEffect, useState } from 'react';

export interface FolderSuggestionsState {
  folders: string[];
  /**
   * Full set of routes (pathnames with leading `/`, no `.mdx`
   * suffix) advertised by the sitemap. Used by the New-Page
   * dialog to surface a collision warning before the author
   * submits, rather than letting the server-side redirect
   * silently bounce them into edit mode on the existing page.
   */
  routes: string[];
  loading: boolean;
  error: Error | null;
}

/**
 * Parse a `sitemap.xml` body into:
 *   - `folders`: the sorted unique list of *parent* folders
 *     implied by its `<url><loc>` entries (used to populate
 *     the ComboBox suggestion list);
 *   - `routes`: the sorted unique list of *leaf* pathnames
 *     (used for collision detection — comparing
 *     `<parent>/<slug>` against this set tells us whether the
 *     would-be new page already exists on disk).
 *
 * For each URL we keep the full pathname in `routes` and emit
 * every ancestor prefix into `folders`. Roots like `/foo`
 * contribute `/foo` (as a route only — there's no parent folder
 * to extract). We do NOT synthesise `/` as a folder — picking
 * the literal root is unusual and the combobox lets authors
 * type it anyway.
 *
 * Exported for unit testing without needing to mock `fetch`.
 */
export function deriveFromSitemap(xml: string): { folders: string[]; routes: string[] } {
  // `DOMParser` is in the DOM lib; this module is `'use client'`
  // so it only ever runs in the browser. Tests can stub via
  // jsdom or by calling `deriveFolders` directly.
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  // Reject XML parse errors silently — the caller already
  // treats an empty result as the degraded-but-functional case.
  if (doc.querySelector('parsererror')) return { folders: [], routes: [] };

  // Next's App Router sitemap (and the sitemaps.org spec) emits
  //
  //   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  //     <url><loc>…</loc></url>
  //     …
  //   </urlset>
  //
  // The default xmlns puts every element in a namespace. When the
  // document is parsed as `application/xml` (not text/html),
  // `querySelectorAll('loc')` matches by qualified name and
  // misses namespaced elements in Firefox/Safari (Chrome is
  // lenient). Use `getElementsByTagNameNS('*', 'loc')` so we
  // match `<loc>` regardless of which namespace it lives in —
  // works uniformly across browsers and for both the namespaced
  // sitemap above and the (rare) un-namespaced variant.
  const folders = new Set<string>();
  const routes = new Set<string>();
  const locs = doc.getElementsByTagNameNS('*', 'loc');
  for (let i = 0; i < locs.length; i++) {
    const text = locs[i].textContent ?? '';
    if (!text) continue;
    let pathname: string;
    try {
      pathname = new URL(text).pathname;
    } catch {
      // Treat as already-relative.
      pathname = text;
    }
    // Strip leading `/` for splitting, then re-prepend on each
    // emitted prefix so the suggestion list is presented in the
    // same shape authors will type (`/docs/...`).
    const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    if (segments.length === 0) continue;
    // Full route (leaf) — used for collision detection.
    routes.add('/' + segments.join('/'));
    // Every ancestor segment — used as a parent-folder suggestion.
    for (let i = 1; i < segments.length; i++) {
      folders.add('/' + segments.slice(0, i).join('/'));
    }
  }

  return {
    folders: Array.from(folders).sort(),
    routes: Array.from(routes).sort()
  };
}

/**
 * `enabled` lets the consumer defer the fetch until the dialog
 * actually opens, so we don't pay the network cost on every page
 * render just because the editor is mounted.
 */
export function useFolderSuggestions(enabled: boolean): FolderSuggestionsState {
  const [state, setState] = useState<FolderSuggestionsState>({
    folders: [],
    routes: [],
    loading: false,
    error: null
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let shouldFetch = false;
    // Use the setter's functional form to read current state
    // without adding it to the effect's deps (which would loop).
    // We mark `shouldFetch` only when neither loaded nor already
    // in-flight; if so, kick the request off below.
    setState(prev => {
      if (prev.folders.length > 0 || prev.routes.length > 0 || prev.loading) return prev;
      shouldFetch = true;
      return { ...prev, loading: true, error: null };
    });
    if (!shouldFetch) return;

    fetch('/sitemap.xml', { credentials: 'same-origin' })
      .then(res => {
        if (!res.ok) throw new Error(`sitemap.xml: HTTP ${res.status}`);
        return res.text();
      })
      .then(xml => {
        if (cancelled) return;
        const { folders, routes } = deriveFromSitemap(xml);
        setState({ folders, routes, loading: false, error: null });
      })
      .catch(err => {
        if (cancelled) return;
        // Fail-soft: empty lists, surface the error for any
        // consumer that wants to log it but don't block the UI.
        setState({ folders: [], routes: [], loading: false, error: err as Error });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
