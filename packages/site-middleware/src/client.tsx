'use client';

import { useEffect, useLayoutEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** Mount only when the host chooses to canonicalize a folder/index URL. */
export function CanonicalizeUrl({ canonical }: { canonical: string }) {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (!pathname) return;
    const { pathname: browserPathname, search, hash } = window.location;
    // Next exposes the route pathname without its configured basePath.
    const route = pathname.replace(/\/$/, '');
    const browserPath = browserPathname.replace(/\/$/, '');
    if (!browserPath.endsWith(route)) return;
    const prefix = browserPath.slice(0, browserPath.length - route.length);
    const target = `${prefix}${canonical}`;
    if (browserPathname !== target) {
      window.history.replaceState(window.history.state, '', `${target}${search}${hash}`);
    }
  }, [canonical, pathname]);
  return null;
}

export interface LiveReloadProps {
  endpoint?: string;
  /** Optional host cache/UI notification, once for each content-change event. */
  onContentChanged?: () => void;
}

/** Development helper; hosts decide when to render it and expose the endpoint. */
export function LiveReload({ endpoint = '/api/content/live', onContentChanged }: LiveReloadProps) {
  const router = useRouter();
  useEffect(() => {
    if (typeof EventSource === 'undefined') return undefined;
    const source = new EventSource(endpoint);
    const handleChange = () => {
      router.refresh();
      onContentChanged?.();
    };
    source.addEventListener('content-changed', handleChange);
    return () => {
      source.removeEventListener('content-changed', handleChange);
      source.close();
    };
  }, [endpoint, onContentChanged, router]);
  return null;
}
