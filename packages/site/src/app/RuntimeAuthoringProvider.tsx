'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  AuthoringSiteProvider,
  toAuthoringSite
} from '@jpmorganchase/mosaic-content-editor-plugin/authoringSite';

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
    void fetch('/api/authoring', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Authoring configuration is unavailable');
        const value = await response.json();
        if (value.url !== null && (typeof value.url !== 'string' || !toAuthoringSite(value.url)))
          throw new Error('Invalid authoring configuration');
        if (!controller.signal.aborted) setConfig({ url: value.url ?? undefined, pending: false });
      })
      .catch(error => {
        if (!controller.signal.aborted)
          console.warn('[Mosaic] Could not load authoring configuration', error);
      });
    return () => controller.abort();
  }, [staticExport]);

  useEffect(() => {
    const site = toAuthoringSite(config.url);
    const query = new URLSearchParams(window.location.search);
    // Prerendered pages cannot inspect query parameters on the server.
    if (site && (query.get('edit') === '1' || query.get('new') === '1'))
      window.location.replace(site.href(`${window.location.pathname}${window.location.search}`));
  }, [config.url]);

  return (
    <AuthoringSiteProvider url={config.url} pending={config.pending}>
      {children}
    </AuthoringSiteProvider>
  );
}
