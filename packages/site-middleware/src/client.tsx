'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Mount only when the host chooses to canonicalize a folder/index URL. */
export function CanonicalizeUrl({ canonical }: { canonical: string }) {
  useLayoutEffect(() => {
    if (window.location.pathname !== canonical) {
      const { search, hash } = window.location;
      window.history.replaceState(window.history.state, '', `${canonical}${search}${hash}`);
    }
  }, [canonical]);
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
