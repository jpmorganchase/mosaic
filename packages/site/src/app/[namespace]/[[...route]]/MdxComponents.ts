'use client';

/**
 * Host configuration for the reference site's MDX renderer.
 *
 * `createMdxRenderer` (from `@jpmorganchase/mosaic-site-components`)
 * owns the actual `<MDXClient />` wiring -- this file just declares the
 * host's *additions* on top of the Mosaic defaults. Server-rendered
 * pages import `MdxRenderer` from here via `BodyServer.tsx`.
 *
 * Two exports for two consumers:
 *   - `MdxRenderer` -- the ready-to-use renderer component, used by
 *     `BodyServer.tsx` for the production page render.
 *   - `mdxComponents` -- the merged registry (Mosaic defaults + host
 *     additions), used by `EditorBody.tsx` to feed the editor plugin's
 *     own component map (the editor manages its own preview render
 *     and just needs the components, not a renderer).
 *
 * Marked `'use client'` so the Salt-DS / Sitemap imports stay in the
 * client graph -- the server page (a Server Component) imports only
 * value exports from this module, which acts as the RSC boundary.
 *
 * Hosts customise the registry here:
 *   - `Salt` -- a curated subset of `@salt-ds/core` the reference
 *     content actually uses. Keep this list intentionally small;
 *     hosts with bigger registries (developer-site, salt-ds) maintain
 *     their own lists.
 *   - `Sitemap` -- Mosaic's sitemap-rendering component, opt-in here
 *     so the dep stays out of consumers that don't need it.
 */
import { Card, GridItem, GridLayout, SplitLayout, StackLayout, Text } from '@salt-ds/core';
import {
  components as mosaicDefaultComponents,
  createMdxRenderer
} from '@jpmorganchase/mosaic-site-components';
import { Sitemap } from '@jpmorganchase/mosaic-sitemap-component';

const Salt = { Card, GridItem, GridLayout, SplitLayout, StackLayout, Text };

const hostComponents = { Salt, Sitemap };

export const mdxComponents = {
  ...mosaicDefaultComponents,
  ...hostComponents
};

export const MdxRenderer = createMdxRenderer({ components: hostComponents });
