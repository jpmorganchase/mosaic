'use client';

/**
 * The site where content is edited, when it isn't this one.
 *
 * A site usually runs in several environments that read different
 * branches: dev reads `develop`, test reads `main`, and so on. An edit
 * always raises a pull request against the branch the environment reads,
 * so editing on test would skip dev. Hosts set the authoring site on
 * every environment except the one authors use (the reference site reads
 * `MOSAIC_AUTHORING_URL`). The editor controls then open the same page on
 * the authoring site instead of editing here.
 */
import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react';

export interface AuthoringSite {
  /** The authoring site's URL, without a trailing slash. */
  url: string;
  /** Its host, for labels such as "Edit Page on dev.example.com". */
  host: string;
  /** The URL of `pathAndQuery` (starting with `/`) on the authoring site. */
  href(pathAndQuery: string): string;
}

const AuthoringSiteContext = createContext<AuthoringSite | undefined>(undefined);
const AuthoringSitePendingContext = createContext(false);
AuthoringSiteContext.displayName = 'AuthoringSiteContext';

/** Parses `url`; `undefined` unless it is an absolute http(s) URL. */
export function toAuthoringSite(url: string | undefined): AuthoringSite | undefined {
  if (!url) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
  // Keep any base path (`https://example.com/docs`); drop query and hash.
  const base = `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
  return {
    url: base,
    host: parsed.host,
    href: pathAndQuery => `${base}${pathAndQuery.startsWith('/') ? '' : '/'}${pathAndQuery}`
  };
}

/** Sets the authoring site. Without one, or with an invalid `url`, pages are edited here. */
export function AuthoringSiteProvider({
  url,
  pending = false,
  children
}: {
  url: string | undefined;
  /** Hide editor entry points until a host resolves its runtime configuration. */
  pending?: boolean;
  children?: ReactNode;
}) {
  const value = useMemo(() => toAuthoringSite(url), [url]);
  return createElement(
    AuthoringSitePendingContext.Provider,
    { value: pending },
    createElement(AuthoringSiteContext.Provider, { value }, children)
  );
}

/** The authoring site, or `undefined` when pages are edited on this site. */
export function useAuthoringSite(): AuthoringSite | undefined {
  return useContext(AuthoringSiteContext);
}

export function useAuthoringSitePending(): boolean {
  return useContext(AuthoringSitePendingContext);
}
