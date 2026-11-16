# Feedback: migrating downstream hosts to the App Router snapshot

This feedback comes from moving three downstream Mosaic hosts from the Pages Router on `0.1.0-beta.98` to the App Router on `0.0.0-snapshot-20261109102658` (#893):

- **Site A**: a private design-system documentation site with about 360 MDX pages.
- **Site B**: a large private documentation site.
- **salt-ds**: the Salt design system's documentation site (jpmorganchase/salt-ds#7139), with 396 MDX pages.

Each host works around the issues below with patches or its own code. Fixing them in Mosaic would let every host drop those workarounds.

Every item was checked against `0ea0eeb5` (#908), and line numbers refer to that commit. Scores and timings are from Lighthouse 13.6 (mobile, simulated throttling unless stated) against a local production build of Site B, so the before-and-after differences matter more than the absolute numbers.

The status was rechecked against `b1c0721d` on #931. Eight items are addressed and listed under [Addressed](#addressed) at the end, and four are partly addressed. Four are better handled outside Mosaic and listed under [Better handled outside Mosaic](#better-handled-outside-mosaic). Items keep their original numbers. Line numbers in the open items still refer to `0ea0eeb5`; since then the catch-all has moved from `[[...route]]` to `[...route]`, and its static params to `[namespace]/staticRouteParams.ts`.

## Summary

| #   | Change                                               | Package                               | Hosts           | Status           |
| --- | ---------------------------------------------------- | ------------------------------------- | --------------- | ---------------- |
| 2   | Publish the App Router host plumbing                 | `store`, `site-middleware`, `layouts` | Site A, salt-ds | Open             |
| 3   | Publish the logic hosts copy from the catch-all page | `site-middleware`                     | salt-ds         | Partly addressed |
| 4   | Make next-auth optional                              | `site-components`                     | Site A, salt-ds | Open             |
| 7   | Document how extension packages depend on Mosaic     | Docs                                  | Site A          | Open             |
| 8   | Render MDX in a Server Component                     | `site-components`                     | Site B          | Open             |
| 9   | Make the server HTML match the hydrated page         | `components`, `theme`, `site`         | Site B          | Partly addressed |
| 10  | Render the app header on the server                  | `site-components`                     | Site B          | Open             |
| 12  | Send the namespace shared config once                | `site-middleware`, `site`             | salt-ds         | Open             |
| 16  | Contain hydration errors to the MDX body             | `site-components`                     | Site A          | Open             |
| 17  | Fix content pitfalls in Mosaic components            | `components`                          | Site A          | Open             |
| 19  | Don't derive the prerender list from the SEO sitemap | `cli`, `site-middleware`              | salt-ds         | Partly addressed |
| 20  | Register stores in effects, not during render        | `store`                               | salt-ds         | Partly addressed |

## Suggested order

1. **Quick fix:** 7.
2. **Next:** 4.
3. **Then:** 2, 10, 12, 16, 17 and the rest of 3.
4. **Larger projects:** 8 and the rest of 9.
5. **Lower priority:** the rest of 20 and the route manifest in 19.

## Packaging and releases

### 2. Publish the App Router host plumbing

**Problem.** A host only works on the App Router after copying these files from the private reference site (`packages/site/src`):

- `app/[namespace]/NamespaceFrame.tsx` (`NamespaceFrame`, `FrameSync`)
- `app/providers.tsx` (`Providers`, `StoreShell`)
- `app/[namespace]/[[...route]]/CanonicalizeUrl.tsx`
- `app/LiveReload.tsx`, `lib/liveReloadBus.ts` and `app/api/content/live/route.ts`
- `app/api/revalidate/route.ts`

Site A carries about 570 copied lines, and salt-ds carries its own copy of the same set. Fixes made upstream, such as changes to store reseeding, don't reach these hosts.

Two details from the salt-ds copies are worth taking upstream:

- Its `/api/content/live` route also cleans up when `request.signal` aborts. The reference route only cleans up in `cancel()` (`packages/site/src/app/api/content/live/route.ts:67`).
- When content changes, its `LiveReload` also refreshes its SWR cache for `/search-data.json`. That needs a change callback.

These files can't simply move into `mosaic-site-components`. `NamespaceFrame` and `StoreShell` import from `mosaic-layouts`, which already depends on `mosaic-site-components`, so that would create a dependency cycle.

**Suggestion.** Split the code across existing packages by what it depends on:

- **`mosaic-store`:** the frame context (`FrameProvider` and `useFrame`, moved from `mosaic-layouts`, which can re-export them), the frame's store and `FrameSync`, and the store hook from item 20 that `StoreShell` is built on. The header is passed in as a prop or children.
- **`mosaic-site-middleware`**, which already has `next` and `react` peers: `CanonicalizeUrl`, `LiveReload` with an `onContentChanged` option, and route-handler factories such as `createRevalidateHandler()` and `createLiveReloadHandler()`, with the abort cleanup.
- **`mosaic-layouts`:** ready-made `NamespaceFrame` and `StoreShell` wrappers that add `AppHeader`, `LayoutHeader`, `LayoutProvider` and the image and link providers. `mosaic-layouts` can depend on all the other packages without a cycle.

Hosts that use Mosaic's layouts would use the wrappers. Hosts with their own layouts, such as salt-ds, would build on the lighter pieces. Either way, hosts keep only thin `layout.tsx` and `route.ts` files.

### 3. Publish the logic hosts copy from the catch-all page

**Partly addressed.** `resolveContent` now returns the final `sharedConfig`: the folder's config with the page's authored `sharedConfig` on top, with `sourceCapabilities` always taken from the folder (`cf7872d8`). Hosts no longer need to copy the capability-safe merge, and salt-ds can drop its copy once it's on a snapshot that includes the change.

**Problem.** Besides the files in item 2, salt-ds copies logic from the reference catch-all (`packages/site/src/app/[namespace]/[[...route]]/page.tsx`):

- `generateStaticParams` (`page.tsx:93`). salt-ds's copy predates #899, which shows how copies drift from upstream fixes.
- `generateMetadata` (`page.tsx:157`). salt-ds's copy emits the title, description, canonical URL and breadcrumbs, but not the Open Graph and Twitter tags the reference site has.

**Suggestion.** Export helpers for static params and metadata, for example `generateMosaicStaticParams({ include })` and `buildMosaicMetadata(resolved)`.

### 4. Make next-auth optional

**Problem.** `Metadata.tsx:14` and `AppHeaderControls/index.tsx:96` in `mosaic-site-components` call `useSession()` unconditionally. Every host therefore needs `next-auth` (peer `^5.0.0-beta.30`, `packages/site-components/package.json:65`) and a `SessionProvider`, even without sign-in. salt-ds has no sign-in, but installs `next-auth@5.0.0-beta.32` only to satisfy this peer.

The reference site's no-auth setup (`packages/site/src/app/providers.tsx:80`) is `<SessionProvider session={null}>`, which still fetches `/api/auth/session` in development:

- React Strict Mode runs the provider's mount effect twice.
- The effect's cleanup resets the cached session to `undefined`, so the second run fetches it.
- A host without an `/api/auth` route gets HTML back instead of JSON, and logs `ClientFetchError: Unexpected token '<'` on every page under `next dev`.

The reference site's comments say the opposite (`providers.tsx:68` and `packages/site/src/app/layout.tsx:48`), so hosts that copy them don't expect the request.

**Workaround.** Site A provides `SessionContext` directly, with a fixed signed-out value, instead of using `SessionProvider`.

**Suggestion.** Read the session through a Mosaic hook or context that defaults to signed out. Make `next-auth` an optional peer dependency that is only needed when login is enabled.

### 7. Document how extension packages depend on Mosaic

**Problem.** The `0.0.0-snapshot-<timestamp>` versioning is intentional. `scripts/snapshot/validateTarballs.mjs` says it exists "so a snapshot can never satisfy a normal range", and it should stay that way.

It does have a side effect for downstream packages that list `@jpmorganchase/mosaic-*` under `dependencies` with a `^0.1.0-beta.x` range:

- Installed next to a snapshot host, they pull in a second copy of `mosaic-components` and `mosaic-store`.
- Their components then read a different React context and store from the host's.

**Suggestion.** Document that extension packages should declare Mosaic packages as `peerDependencies`. Also add a "Trying a snapshot" section with a `resolutions` example.

## Performance

### 8. Render MDX in a Server Component

**Problem.** `createMdxRenderer` is a client component. The server serializes each page, and `MDXClient` evaluates the compiled source in the browser. As a result, every page downloads the MDX runtime and the whole component registry, and hydrates prose (headings, paragraphs and lists) that never changes.

On Site B, every page downloads about 590KB of compressed JavaScript, including a 242KB shared chunk with Mosaic, Salt and the MDX runtime. Lighthouse reports about 300KB of it as unused. This is now what holds the home page's mobile performance score at 74; the other pages measured score 100.

**Suggestion.** Compile and render MDX in a Server Component (for example with `next-mdx-remote-client/rsc`), so only components marked `'use client'` send JavaScript to the browser. Keep `createMdxRenderer` for the editor preview, which has to render in the browser. The default `helpers` scope would need to be available on the server, and registry components that use hooks would need `'use client'`.

This is a project rather than a fix. First check what the unused JavaScript is. If most of it is registry components the page doesn't use, loading them lazily (for example with `next/dynamic`) would be a cheaper first step.

### 9. Make the server HTML match the hydrated page

**Problem.** Several things only took effect after hydration, so the browser first painted the server HTML in a different state and then changed it.

**Partly addressed.** On #931:

- The reference root layout imports Salt's static `salt-core.css` and `salt-icon.css`, and renders `data-accent`, `data-corner`, `data-heading-font` and `data-action-font` on `<html>` (`f80bf1d9`).
- The theme script (`packages/site/src/lib/themePrefScript.ts`) reads the stored mode safely, so first-time visitors get `data-mode`. It also sets `salt-density-low` or `salt-density-touch` before the first paint.
- `baseline.css.ts` no longer hides images and icons under `.mosaic-ssr`.

Starting `ThemeProvider`'s density from the media query was deliberately left out. Density changes the markup of nested components, so the first client render has to match the server's (`fd009fca`).

**Remaining.**

- Salt still injects its component CSS at runtime. Wrap the providers in `<StyleInjectionProvider value={false}>` from `@salt-ds/styles`, and ship the stylesheet list from `mosaic-site-preset-styles`, including `@salt-ds/lab` and any other Salt packages Mosaic's components use. Otherwise every host has to keep its own list in step, and a host that misses one gets unstyled components once injection is off.
- `AppHeaderControls` is still `visibility: hidden` until `ThemeProvider` removes the `mosaic-ssr` class (`packages/site-components/src/AppHeaderControls/styles.css.ts:20`).
- On desktop, the reference site's Getting started page still shifts (CLS 0.101), because `Tiles` and `GridLayout` choose their columns after hydration. This was deferred.

### 10. Render the app header on the server

**Problem.** `AppHeader` renders the logo, home link, tabs and drawer only after mount (`mounted && …`, `packages/site-components/src/AppHeader/AppHeader.tsx:51`), so that theme-dependent UI isn't rendered before hydration. `0.1.0-beta.98` rendered them on the server. Now the header is empty until hydration; then its contents appear and shift sideways. The browser also can't find the logo until JavaScript runs, so Site B preloads it manually.

**Suggestion.** Render the logo, home link, tabs and drawer on the server. Switch a theme-dependent logo with CSS on `data-mode`, and choose between tabs and the drawer with a CSS media query rather than `useBreakpoint`.

### 12. Send the namespace shared config once

**Problem.** The shared config is sent with every page, often twice:

- The namespace layout loads the shared config for `/<namespace>/index` (`packages/site/src/app/[namespace]/layout.tsx:39`).
- Each page then loads the config for its own folder through `resolveContent`, and passes it to `StoreShell` and `FrameSync` (`packages/site/src/app/[namespace]/[[...route]]/page.tsx:511` and `:528`).
- `getSharedConfig` caches by folder (`packages/site-middleware/src/cachedLoaders.ts:152` and `:245`). For pages below the top level, the layout's copy and the page's copy are therefore separate objects, and React serializes both.

On salt-ds, the shared config is 42,129 bytes (4,502 gzipped), and the sidebar tree accounts for 42,046 bytes of it. Pages below the top level send it twice in their initial HTML, and every client navigation sends it again.

**Suggestion.** Keep namespace-level config (header, footer, sidebar) in the frame. Have `resolveContent` return only a page's own overrides, or a key the page can compare with the frame's copy before sending it.

## Hydration errors

### 16. Contain hydration errors to the MDX body

**Problem.** `createMdxRenderer` (`packages/site-components/src/MdxHost/createMdxRenderer.tsx`) renders `MDXClient` without a `<Suspense>` boundary. The page deliberately has none either (see the comment at `packages/site/src/app/[namespace]/[[...route]]/page.tsx:495`).

This has two effects:

- Any hydration mismatch in authored content, such as a locale-formatted date (item 15) or invalid nesting (items 14 and 17), makes React discard the server HTML up to the root and re-render the whole document.
- In development this also logs "Encountered a script tag while rendering React component" for the root layout's theme script. That points authors at the wrong file.

It also means content can't use `use(browser())` without supplying its own boundary, as item 15's component does.

**Suggestion.** Wrap `MDXClient` in a `<Suspense>` boundary inside `createMdxRenderer`. React then recovers from a mismatch by re-rendering only the MDX body.

`MDXClient` doesn't suspend, so the boundary's fallback should only show when content suspends. It therefore shouldn't bring back the navigation flash that the `page.tsx` comment describes. If testing confirms that, make the boundary the default. Otherwise make it opt-in, for example `createMdxRenderer({ suspense: { fallback } })`, and document the trade-off.

### 17. Fix content pitfalls in Mosaic components

Each of these appeared on several pages of Site A after the migration.

- **Heading anchors nest links.**
  - Problem: `AnchorHeading` (`packages/components/src/Markdown/AnchorHeading/index.tsx`) wraps the whole heading in a `Link`. A heading that contains a link therefore renders `<a>` inside `<a>`, which causes a hydration error.
  - Suggestion: render the anchor as a sibling control, or warn in development when the heading contains a link.
- **`Link` passes unknown props to `<a>`.**
  - Problem: in MDX, `Link` resolves to Mosaic's `Link`, but authors often use Salt's `Link` API instead, such as `IconComponent={null}`. `Link` spreads `...rest` onto the anchor (`packages/components/src/Link/index.tsx:72`). React then warns about an unknown DOM prop, and the icon still appears.
  - Suggestion: warn in development about props `Link` doesn't support, and document that `Link` in MDX is Mosaic's, not Salt's. Aliasing Salt's `IconComponent` would mix the two APIs, and filtering out props that aren't valid on `<a>` risks dropping `data-*` and `aria-*` attributes.
- **`Tag` ignores its children and renders a `<div>`.**
  - Problem: `<Tag>RC</Tag>` renders an empty pill, because `Tag` only reads `label`. When used inline in prose, its `<div>` (`packages/components/src/Tag/index.tsx:41`) is invalid inside a `<p>`.
  - Suggestion: use `children` when `label` isn't set, and render a `<span>`.
- **Typography components default to `<p>`.**
  - Problem: `Typography` defaults `component` to `'p'` (`packages/components/src/Typography/Typography.tsx:17`). A line such as `<Subtitle5>…</Subtitle5> more text` therefore nests a `<p>` inside a `<p>`.
  - Suggestion: add a development warning or a note in the authoring docs.

## Routing and build

### 19. Don't derive the prerender list from the SEO sitemap

**Partly addressed.** A production snapshot build now fails when the sitemap is missing or empty, instead of prerendering nothing (`cbd3f9e4`, `packages/site/src/app/[namespace]/staticRouteParams.ts`).

**Problem.** `generateStaticParams` still gets its routes from `loadSitemap()`, so it depends on `SiteMapPlugin`, which hosts configure for SEO. salt-ds had to add `SiteMapPlugin` during the migration. Its `exclude: ["**/salt-github/**"]` setting now controls both the sitemap and which pages are prerendered, so leaving a page out of the sitemap also stops it being prerendered.

**Suggestion.** Have `mosaic build` always write a route manifest, whatever the `SiteMapPlugin` settings. Use it for `generateStaticParams` and for item 18, and fail the build if it's missing or empty.

### 20. Register stores in effects, not during render

**Partly addressed.** Colour mode now lives in one root `ColorModeProvider` from `mosaic-store` (`b1c0721d`). Content stores hold only document data, `initializeStore` has no side effects, and `registerStore` and `disposeStore` are gone, so stores created for renders React discards no longer stay subscribed.

**Remaining.**

- salt-ds still repeats the code that creates a store and reseeds it on refresh. A hook, for example `useMosaicStore(seed)`, would replace those copies.
- Hosts' inline colour-mode scripts still hard-code the storage key, `mosaic-theme-pref`, which is private to `ColorModeProvider`. Export the key, or a ready-made script with the fixes from item 9, so a rename upstream can't silently break them.

## Better handled outside Mosaic

These are better left to hosts, documented, or left to Next.js. Each keeps the original feedback below the reason.

### 6. Make `mosaic-site-middleware` loadable outside a bundler

**Why not in Mosaic.** The content loaders rely on Next's cache by design, and `mosaic-site-middleware/search`, the entry that's useful without Next, already loads in plain Node (the packed-consumer smoke test imports it). Documenting `MOSAIC_DISABLE_LOADER_CACHE` for scripts is enough.

**Problem.** The package's `dist` output is ES modules, but `package.json` has no `"type": "module"`. `cachedLoaders.ts:40` also imports `next/cache` without a file extension. `next` has no `exports` map, so Node's ES module resolver can't find `next/cache`.

The package therefore only loads inside a bundler. Importing it from a Node script fails with `ERR_MODULE_NOT_FOUND`. salt-ds hit this when checking how its routes resolve against a generated snapshot outside Next.js.

Loading the package isn't enough on its own. Outside Next.js, `unstable_cache` throws `Invariant: incrementalCache missing`, so the loaders only work with `MOSAIC_DISABLE_LOADER_CACHE=true` (`cachedLoaders.ts:70`).

**Suggestion.** Add `"type": "module"`, and import `next/cache.js`, which resolves both in Node and in bundlers. Document that scripts need `MOSAIC_DISABLE_LOADER_CACHE=true`.

### 13. Keep the compile cache when hosts add plugins

**Why not in Mosaic.** The case that needed it was fixing item 14 with a rehype plugin, and item 14 is now fixed in Mosaic. A host-supplied key also risks serving stale output when it's wrong. Revisit if a host needs custom plugins and the compile time matters.

**Problem.** `serializeMdxForClient` only caches the default pipeline (`packages/site-middleware/src/serializeMdxForClient.ts:111`), so passing any `remarkPlugins` or `rehypePlugins` disables caching. That's why Site A fixed item 14 with a component override instead of a rehype plugin.

**Suggestion.** Add an explicit `cacheKey` option, so a host whose plugin configuration is stable can opt back in to caching.

### 15. Provide a hydration-safe date component

**Why not in Mosaic.** How a site formats dates is its own choice. Mosaic's part is the Suspense boundary in item 16, which keeps a mismatch to the MDX body, and a note about locale-dependent formatting in the authoring docs.

**Problem.** Content often shows dates with `new Date(published).toLocaleDateString()`. With no locale, the server and browser can format the same date differently (for example `11/14/2026` and `14/11/2026`). That causes React error #418, and React then re-renders the whole page in the browser (item 16), which delays its largest paint. Fixing it took Site B's product landing page from a 6.4s to a 0.8s largest paint on mobile, and its score from 76 to 100.

**Workaround.** Two of the sites wrote the same fix independently. The server renders a fixed-locale date as a Suspense fallback, and React 19.3's `browser()` from `react-dom` swaps in the reader's locale after hydration, without a mismatch:

```tsx
'use client';
import { Suspense, use } from 'react';
import { browser } from 'react-dom';

const FIXED = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

function ReaderLocaleDate({ value }: { value: string | number | Date }) {
  use(browser("Dates are formatted in the reader's locale."));
  return new Date(value).toLocaleDateString();
}

export function PublishedDate({ value }: { value: string | number | Date }) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return (
    <Suspense fallback={FIXED.format(date)}>
      <ReaderLocaleDate value={value} />
    </Suspense>
  );
}
```

**Suggestion.** Add a date component to the default MDX components, with an option to include the time, and recommend it in the authoring docs.

By default, format dates with a locale from the site config and a month-name format such as `14 Nov 2026`. That can't be misread in any locale, doesn't change after hydration, and renders on the server without client JavaScript (item 8). Offer the reader's locale as an option, using the approach above. That option needs `browser()` from React 19.3, so it depends on raising the `react` peer from `^19.1.0`.

### 18. Serve real 404 HTML for missing pages

**Why not in Mosaic.** This is a Next.js bug, and according to the thread a fix (vercel/next.js#88491) has been open since January. The workaround suggested in the thread (dropping the catch-all, `experimental.globalNotFound` and an `afterFiles` rewrite) doesn't help Mosaic:

- Mosaic already has a root `app/layout.tsx` and `app/not-found.tsx`, so unmatched URLs are already server-rendered. `globalNotFound` only matters when the root layout sits under a segment such as `[lang]`.
- `[namespace]` and `[namespace]/[...route]` match every path, so every missing page is a `notFound()` from a matched route, which still gets the empty shell.
- A static rewrite can't tell which pages exist. salt-ds's proxy rewrite to `/_not-found` does, but it costs a lookup on every request.

If the Next.js fix doesn't land, the cheapest Mosaic-side fix is item 19's route manifest plus a small proxy helper.

**Problem.** When a matched page calls `notFound()`, Next.js responds with a 404 status but an empty HTML shell. The not-found UI only appears after the client renders it (vercel/next.js#62228, still open on Next.js 16.4). The reference catch-all calls `notFound()` this way (`packages/site/src/app/[namespace]/[[...route]]/page.tsx:261` and `:401`).

**Workaround.** salt-ds works around this in its `proxy.ts`:

- It calls `resolveContent` for each document URL and rewrites misses to `/_not-found` with a 404 status.
- As a result, every document request runs a full `resolveContent` (MDX and shared config, cached for pages that exist), including requests for prerendered pages.

**Suggestion.** Export a cheap existence check, such as `routeExists(pathname)`, backed by the route manifest from item 19. Then either ship a proxy helper hosts can re-export, or document this workaround. The check must let `?new=1` page creation through, because the page renders missing routes in that mode (`page.tsx:261`).

The response already has a 404 status, so crawlers aren't affected. The empty shell mainly affects readers without JavaScript or on slow connections, so this is lower priority. Waiting for the Next.js fix is a reasonable alternative.

### Parts of open items

- **2:** salt-ds's `LiveReload` refreshes its SWR cache for `/search-data.json`. That file is no longer generated, so only the generic `onContentChanged` callback is still needed.
- **3:** which Open Graph and Twitter tags a site emits. A Mosaic metadata helper should return base metadata that hosts extend.
- **9:** stylesheets for Salt packages only the host uses, such as salt-ds's `@salt-ds/lab`. Mosaic should ship only the ones its own components need.
- **17:** the `Link` props and `Typography` default only need a note in the authoring docs. Changing `Typography`'s default element would break existing pages.

## Addressed

These are fixed on #931. Snapshot `0.0.0-snapshot-20261115213905` (from `3f16c888`) includes all of them; it doesn't include the later changes for items 3, 5 and 20 or the Salt consumer fixes from `246dde76` on.

| #   | Change                                                       | Fixed by                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Publish a snapshot from `main`                               | `0.0.0-snapshot-20261115213905`, published from #931. It includes #897, #900 and #902, and publishes `mosaic-sitemap-component`, `mosaic-source-figma` and `mosaic-workflows` at the same version.                                                           |
| 5   | Use one shiki major version                                  | `20cca1a1`. `mosaic-components` uses shiki 4, so hosts install one version. `Pre`'s browser highlighting gives the same HTML as with shiki 3.                                                                                                                |
| 11  | Load the full search index only when search is used          | `fd876622`. Search uses section-level `search-records.json`, queried through `/api/search` by default. Static exports download the records on the first search. `search-data.json` is no longer generated.                                                   |
| 14  | Wrap markdown images in a `span`                             | `18ceb7fc`. `Image` wraps the image in a block-level `<span>`.                                                                                                                                                                                               |
| 21  | Resolve `meta` tokens anywhere in table-of-contents headings | `cb1184ab`. Every `{meta.*}` token is replaced and unresolved tokens are kept. The table of contents is rebuilt in `$beforeSend`, and the default priority is -1.5, after `$RefPlugin` and before `LazyPagePlugin`. Heading ids match the resolved text too. |
| 22  | Ask before Cancel Editing and Stop Editing discard changes   | `abb202c2`. Both buttons go through the unsaved-changes dialog.                                                                                                                                                                                              |
| 23  | Improve CLI and plugin diagnostics                           | `629b5b2f`. `mosaic serve` prints the host, port and cause. `FragmentPlugin` carries on, then fails with every failing page. The Sidebar warning says which case applies. `246dde76` also makes plugin errors fail the build.                                |
| 24  | Label the search input and fix heading roles                 | `05800ee7`. The search input gets its label through `inputProps`. `Hero` drops `role="heading"`, because its title is already an `<h1>`. Markdown headings drop the redundant role.                                                                          |
