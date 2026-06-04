'use client';

/**
 * Client-side MDX evaluation scope.
 *
 * Restored from the Pages Router era (`createMDXScope` in
 * `site-components`) so that MDX content authored against the legacy
 * scope keeps rendering under the App Router pipeline.
 *
 * Why client-side: the App Router pipeline serialises MDX on the
 * server (`serializeMdxForClient`) and ships the payload to the
 * browser as JSON. The server `scope` is therefore JSON-only and
 * cannot carry functions, recipes, or React hooks. Instead, this
 * factory is invoked inside the `'use client'` MDX renderer and its
 * output is merged into `<MDXClient scope={...} />` at render time —
 * functions and hook references live entirely in the client bundle.
 *
 * Surface (kept stable for content compatibility — DO NOT rename
 * without grepping consumer doc corpora first; e.g. salt-ds-internal-docs
 * and onyx-docs use `helpers.flow / sortViewByDate / limit` heavily):
 *
 *   - `helpers.flow`            — lodash `flow`, compose left→right
 *   - `helpers.filter`          — `({ filter }) => view => view.filter(...)`
 *   - `helpers.limit`           — `({ max }) => view => view.slice(0, max)`
 *   - `helpers.sortViewByDate`  — `({ dateKey }) => view => view.sort(...)`
 *   - `recipes`                 — re-export from `@jpmorganchase/mosaic-theme`
 *   - `hooks.useColorMode`      — re-export from `@jpmorganchase/mosaic-store`
 *   - `meta`                    — frontmatter alias (also auto-injected
 *                                 by `serializeMdxForClient` into the
 *                                 server scope; this is the same value)
 */
import { recipes } from '@jpmorganchase/mosaic-theme';
import { useColorMode } from '@jpmorganchase/mosaic-store';
import { flow as flowImpl } from 'lodash-es';

type ViewItem = Record<string, string>;
type ViewTransform = (view: ViewItem[]) => ViewItem[];

type SortValueCallback = (item: ViewItem) => string;
type SortViewByDateFactory = (args: { dateKey: string | SortValueCallback }) => ViewTransform;

/** Sort the view in date order, newest first. */
const sortViewByDate: SortViewByDateFactory =
  ({ dateKey }) =>
  view => {
    const sortedView = view.sort((a, b) => {
      const dateAString = typeof dateKey === 'function' ? dateKey(a) : a[dateKey];
      const dateBString = typeof dateKey === 'function' ? dateKey(b) : b[dateKey];
      let timestampA = Date.parse(dateAString);
      let timestampB = Date.parse(dateBString);
      timestampA = Number.isNaN(timestampA) === false ? timestampA : 0;
      timestampB = Number.isNaN(timestampB) === false ? timestampB : 0;
      return new Date(timestampB).valueOf() - new Date(timestampA).valueOf();
    });
    return sortedView;
  };

type FilterCallback = (item: ViewItem) => boolean;
type FilterFactory = (args: { filter: FilterCallback }) => ViewTransform;

/** Filter the view via filter callback. */
const filter: FilterFactory =
  ({ filter: filterProp }) =>
  view =>
    view.filter(filterProp);

type LimitFactory = (args: { max: number }) => ViewTransform;

/** Limit the number of results. */
const limit: LimitFactory =
  ({ max }) =>
  view =>
    view.slice(0, Math.min(max, view.length));

// Thin wrapper so callers don't accidentally couple to the lodash module
// shape (lets us swap implementations later without a content breaking-change).
// `any` mirrors lodash's own `flow` signature — composition is heterogeneous
// across steps so a tighter generic would require per-arity overloads.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flow = (...funcs: Array<(arg: any) => any>) => flowImpl(...funcs);

export interface MDXScope {
  helpers: {
    flow: typeof flow;
    filter: typeof filter;
    limit: typeof limit;
    sortViewByDate: typeof sortViewByDate;
  };
  recipes: typeof recipes;
  hooks: {
    useColorMode: typeof useColorMode;
  };
  meta: Record<string, unknown>;
}

export function createMDXScope(meta: Record<string, unknown> = {}): MDXScope {
  return {
    helpers: {
      flow,
      filter,
      limit,
      sortViewByDate
    },
    recipes,
    hooks: {
      useColorMode
    },
    meta
  };
}
