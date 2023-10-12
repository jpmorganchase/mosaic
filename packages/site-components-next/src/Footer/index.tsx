import * as React from 'react';
import type { loadPage } from '@jpmorganchase/mosaic-site-mdx-loader';
import { Footer as UI } from '@jpmorganchase/mosaic-site-components';

export async function Footer({ path, fetcher }: { path: string; fetcher: typeof loadPage }) {
  const { data } = await fetcher(path);
  const footerProps = data?.sharedConfig?.footer;
  return <UI {...footerProps} />;
}
