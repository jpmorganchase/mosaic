'use client';

/**
 * Read-only frontmatter viewer.
 *
 * Mounted in place of the WYSIWYG composer / source textarea when
 * `?mode=frontmatter`. Renders the page's frontmatter object as
 * formatted YAML so authors can see — and copy out of — exactly
 * what the renderer (or, when available, the source file on disk)
 * holds.
 *
 * Two data sources, picked per render
 * -----------------------------------
 * The page is loaded twice by the host:
 *
 *   1. `content` (post-plugin) — what the renderer sees. Mosaic
 *      build plugins enrich frontmatter heavily: `sidebar`,
 *      `breadcrumbs`, `navigation`, `tableOfContents`,
 *      `readingTime`, `sharedConfig`, plus anything custom
 *      plugins inject. Always available.
 *
 *   2. `rawSource` (pre-plugin) — the bytes that exist in the
 *      source repository, served by the Mosaic CLI's
 *      `/_mosaic-raw/*` endpoint and forwarded by the host as a
 *      discriminated `RawSourceInput`. Optional: some source
 *      kinds (`source-git-repo`, `source-http`, …) don't yet
 *      expose raw bytes, snapshot deployments don't have them
 *      at all, and some pages are virtual / synthesised and
 *      have no on-disk file.
 *
 * When `rawSource.kind === 'raw'` we display the **authored**
 * frontmatter — exactly what a `git diff` of the source file
 * would show. Otherwise we fall back to the post-plugin view
 * with a per-kind banner explaining *why* the fallback happened
 * (so authors can either fix the deployment to expose raw or
 * accept the noise as informational).
 *
 * Why still read-only
 * -------------------
 * Even with the authored view available, persisting authored
 * edits requires the workflow (`GitHubPullRequestWorkflow` etc.)
 * to honour an `authoredFrontmatter` field in the save payload.
 * Until that lands, surfacing edits would silently drop them on
 * save — strictly worse than the visible read-only viewer.
 *
 * Why YAML (not JSON / not a tree view)
 * -------------------------------------
 * Mosaic's authored frontmatter schema is intentionally loose —
 * values can be strings, arrays, deeply-nested objects, custom
 * keys (`data: {...}`, layout-specific config) picked up by the
 * renderer by convention. A form generator would either lose
 * fidelity for those shapes or balloon into a per-field schema
 * map we'd have to keep in sync with every layout / plugin.
 * YAML matches the on-disk representation byte-for-byte
 * (`gray-matter.stringify` is the same code path that wrote
 * the file), so authors recognise the layout instantly.
 */

import { useMemo } from 'react';
import matter from 'gray-matter';
import { Banner, BannerContent, Text } from '@salt-ds/core';

import type { RawSourceInput } from '../Editor';
import style from './FrontmatterViewer.css';

export interface FrontmatterViewerProps {
  /**
   * Post-plugin (enriched) frontmatter object parsed from the
   * editor's `content` prop. Used as the fallback display when
   * raw source is unavailable.
   */
  meta: Record<string, unknown> | undefined;
  /**
   * Optional raw on-disk source for the current page. When the
   * kind is `'raw'`, we prefer it over `meta` because it reflects
   * what a PR would commit (no plugin noise). Other kinds drive
   * the banner copy that explains why we're falling back.
   *
   * `undefined` matches a host that hasn't plumbed `rawSource`
   * through — same fallback as a host that has but couldn't
   * resolve it. The behaviour is identical so the type isn't
   * narrowed: the viewer treats "absent" and "couldn't resolve"
   * as the same UX.
   */
  rawSource?: RawSourceInput;
}

/**
 * Serialise a frontmatter object to bare YAML (no `---` fences).
 * Empty / missing meta serialises to a placeholder so the pane
 * doesn't look broken on pages that genuinely have none.
 *
 * gray-matter is happy to stringify with an empty body; we then
 * slice off the leading/trailing fence lines it adds. Using
 * gray-matter (rather than `js-yaml` directly) keeps the output
 * formatting consistent with what's written to disk by the
 * persist workflow.
 */
function metaToYaml(meta: Record<string, unknown> | undefined): string {
  if (!meta || Object.keys(meta).length === 0) {
    return '# No frontmatter on this page.';
  }
  try {
    const full = matter.stringify('', meta);
    // Strip trailing whitespace BEFORE removing the closing
    // fence — gray-matter emits `---\n\n` for non-trivial values
    // and the naive `/---\r?\n?$/` regex wouldn't anchor across
    // the blank line, leaving a stray `---` at the bottom of
    // the pane.
    return full
      .replace(/^---\r?\n/, '')
      .replace(/\s+$/, '')
      .replace(/\r?\n?---$/, '');
  } catch (e) {
    // `js-yaml`'s stringifier throws on values it can't represent
    // (cyclic refs, BigInt, functions). Surface the failure rather
    // than blanking the pane — an author can still see *that*
    // something is wrong even if we can't show what.
    return `# Unable to render frontmatter: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/**
 * Parse the YAML frontmatter out of a raw `.mdx`/`.md` file. The
 * raw bytes come from `/_mosaic-raw/*` (see `getMdxRawSource` in
 * `mosaic-site-middleware`), which is the on-disk file verbatim
 * — `matter()` returns exactly what `git diff` would show in the
 * frontmatter block.
 */
function parseRawFrontmatter(bytes: string): Record<string, unknown> {
  try {
    const { data } = matter(bytes);
    return (data ?? {}) as Record<string, unknown>;
  } catch (e) {
    console.warn('[mosaic-content-editor] Failed to parse raw frontmatter:', e);
    return {};
  }
}

interface Resolved {
  /** What to render in the `<pre>`. */
  meta: Record<string, unknown> | undefined;
  /**
   * Banner status. Always `info` — we don't escalate to `warning`
   * for the fallback cases because the read-only state is intended
   * behaviour, not a recoverable error. See the JSX-side rationale
   * on the `<Banner>` element below.
   */
  bannerStatus: 'info';
  /** Body copy of the banner — the per-kind explanation. */
  bannerCopy: string;
  /** Source-of-truth label echoed under the YAML pane. */
  pillLabel: string;
}

/**
 * Map (`meta`, `rawSource`) → what to display and how to label
 * it. Centralised here so the JSX stays declarative and the
 * exhaustiveness check (`switch` on `rawSource.kind`) catches
 * any new `RawSourceInput` variant added in
 * `mosaic-site-middleware`.
 */
function resolveDisplay(
  meta: Record<string, unknown> | undefined,
  rawSource: RawSourceInput | undefined
): Resolved {
  if (rawSource?.kind === 'raw') {
    return {
      meta: parseRawFrontmatter(rawSource.bytes),
      bannerStatus: 'info',
      bannerCopy:
        'Showing the authored frontmatter from your source file. This is the frontmatter a pull request would update.',
      pillLabel: rawSource.namespace ? `On-disk source · ${rawSource.namespace}` : 'On-disk source'
    };
  }

  // Everything else falls back to the post-plugin view. The
  // copy varies so an author can tell the difference between
  // "I need to fix my source plugin config" and "this page is
  // virtual" and "I'm running in snapshot mode".
  const fallback = {
    meta,
    bannerStatus: 'info' as const,
    pillLabel: 'Rendered view (post-plugin)'
  };
  if (rawSource === undefined) {
    return {
      ...fallback,
      bannerCopy:
        'Frontmatter is read-only in the editor. The fields below are the rendered view and include values added by build plugins (sidebar, breadcrumbs, etc.). Edits here are not saved.'
    };
  }
  switch (rawSource.kind) {
    case 'unsupported-source':
      return {
        ...fallback,
        bannerCopy: rawSource.modulePath
          ? `Raw source unavailable: ${rawSource.modulePath} doesn't yet expose raw bytes. Showing the rendered (post-plugin) view, which includes build-plugin output.`
          : "Raw source unavailable: this source kind doesn't yet expose raw bytes. Showing the rendered (post-plugin) view, which includes build-plugin output."
      };
    case 'no-matching-source':
      return {
        ...fallback,
        bannerCopy:
          'This page has no on-disk source — no source plugin claims it. Showing the rendered (post-plugin) view.'
      };
    case 'unavailable-in-mode':
      return {
        ...fallback,
        bannerCopy: `Raw source isn't available in ${rawSource.mode} mode (snapshot deployments hold post-plugin output). Showing the rendered view, which includes build-plugin frontmatter.`
      };
    case 'not-found':
      return {
        ...fallback,
        bannerCopy:
          "The source file couldn't be found on disk (it may have just been renamed). Showing the rendered (post-plugin) view as a fallback."
      };
    default: {
      // Exhaustiveness check — TypeScript will flag this if a
      // new variant is added to `RawSourceInput` and forgotten
      // here. The runtime branch falls through to the same
      // copy as `undefined`.
      const _exhaustive: never = rawSource;
      void _exhaustive;
      return {
        ...fallback,
        bannerCopy: 'Frontmatter is read-only in the editor.'
      };
    }
  }
}

export const FrontmatterViewer = ({ meta, rawSource }: FrontmatterViewerProps) => {
  const {
    meta: displayed,
    bannerStatus,
    bannerCopy,
    pillLabel
  } = useMemo(() => resolveDisplay(meta, rawSource), [meta, rawSource]);
  const yaml = useMemo(() => metaToYaml(displayed), [displayed]);

  return (
    <div className={style.root}>
      {/*
        `status="info"` (not `"warning"`) even for the fallback
        cases — the read-only state is the intended behaviour
        across the board, not a recoverable error, and a
        warning-coloured banner on every editor mount in a
        deployment that uses (e.g.) `source-git-repo` would
        train users to ignore it. The *copy* carries the
        signal; colour stays neutral.
      */}
      <Banner status={bannerStatus} className={style.banner}>
        <BannerContent role="note">
          <Text>{bannerCopy}</Text>
        </BannerContent>
      </Banner>
      {/*
        Tiny inline label between banner and YAML so the user
        can tell at a glance which data source is rendered —
        important when flipping between deployments where the
        same route resolves to different kinds of source.
      */}
      <div className={style.sourceLabel} aria-hidden>
        {pillLabel}
      </div>
      {/*
        Render as a `<pre>` rather than a `<textarea readonly>`:
        a read-only textarea inherits form-field affordances
        (focus ring suggesting interactivity, mobile keyboard
        on tap) that mislead users. `<pre>` is unambiguously
        non-interactive but stays selectable for copy / paste.
      */}
      <pre
        className={style.pre}
        aria-label={`Frontmatter (YAML, read-only) — ${pillLabel}`}
        // `tabIndex={0}` so keyboard users can scroll the
        // overflow region with arrow keys — the default for
        // a non-focusable `<pre>` is "tab past entirely",
        // which strands keyboard users on long frontmatter
        // blocks.
        tabIndex={0}
      >
        {yaml}
      </pre>
    </div>
  );
};
