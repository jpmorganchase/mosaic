'use client';

/**
 * MDX component registry passed to `<MdxRenderer />` via
 * `mdx-remote-client`'s `<MDXClient components={...} />`.
 *
 * Marked `'use client'` so the Salt DS imports stay in the client
 * graph — the page (a Server Component) imports a single value from
 * this module, which acts as the boundary.
 */
import { Card, GridItem, GridLayout, SplitLayout, StackLayout, Text } from '@salt-ds/core';
import { components as mosaicComponents } from '@jpmorganchase/mosaic-site-components';
import { Sitemap } from '@jpmorganchase/mosaic-sitemap-component';

const saltComponents = { Card, GridItem, GridLayout, SplitLayout, StackLayout, Text };

export const mdxComponents = {
  ...mosaicComponents,
  Salt: saltComponents,
  Sitemap
};
