import { getLlmsDiscovery } from '@jpmorganchase/mosaic-site-middleware';

/** Server-rendered in every mode; React hoists both links into the HTML head. */
export async function LlmsMetadata({ route, pathname }: { route: string; pathname?: string }) {
  const discovery = await getLlmsDiscovery(route, pathname);
  if (!discovery) return null;
  return (
    <>
      <link rel="alternate" type="text/markdown" href={discovery.markdownUrl} />
      <link rel="describedby" href={discovery.indexUrl} />
    </>
  );
}
