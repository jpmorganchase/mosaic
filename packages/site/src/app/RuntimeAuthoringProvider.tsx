'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  AuthoringSiteProvider,
  toAuthoringSite
} from '@jpmorganchase/mosaic-content-editor-plugin/authoringSite';

function AuthoringRedirect({ url }: { url: string }) {
  const pathname = usePathname();
  const search = useSearchParams()?.toString();

  useEffect(() => {
    if (!pathname) return;
    const query = new URLSearchParams(search);
    if (query.get('edit') !== '1' && query.get('new') !== '1') return;
    const site = toAuthoringSite(url);
    const { pathname: path, search: rawSearch, hash } = window.location;
    if (site) window.location.replace(site.href(`${path}${rawSearch}${hash}`));
  }, [pathname, search, url]);

  return null;
}

export function RuntimeAuthoringProvider({
  url,
  staticExport,
  children
}: {
  url?: string;
  staticExport: boolean;
  children: ReactNode;
}) {
  const [config, setConfig] = useState<{ url?: string; pending: boolean }>(() =>
    staticExport ? { url, pending: false } : { pending: true }
  );
  useEffect(() => {
    if (staticExport) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 1000;
    const load = async () => {
      try {
        const response = await fetch('/api/authoring', {
          cache: 'no-store',
          signal: controller.signal
        });
        if (!response.ok) throw new Error('Authoring configuration is unavailable');
        const value = await response.json();
        if (value.url !== null && (typeof value.url !== 'string' || !toAuthoringSite(value.url)))
          throw new Error('Invalid authoring configuration');
        if (!controller.signal.aborted) setConfig({ url: value.url ?? undefined, pending: false });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (delay === 1000) console.warn('[Mosaic] Could not load authoring configuration', error);
        timer = setTimeout(() => void load(), delay);
        delay = Math.min(delay * 2, 30_000);
      }
    };
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [staticExport]);

  return (
    <AuthoringSiteProvider url={config.url} pending={config.pending}>
      <Suspense fallback={null}>
        {config.url ? <AuthoringRedirect url={config.url} /> : null}
      </Suspense>
      {children}
    </AuthoringSiteProvider>
  );
}
