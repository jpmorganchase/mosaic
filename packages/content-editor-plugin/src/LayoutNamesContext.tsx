'use client';

/**
 * Shared registry of layout names available to the running host.
 *
 * Populated by the host's layout provider (typically
 * `<LayoutProvider>` in `@jpmorganchase/mosaic-layouts`, which
 * already owns the canonical `layoutComponents` record) and
 * consumed by the editor's `FrontmatterEditor` so the `layout`
 * frontmatter field renders as a typeahead picker instead of a
 * free-text input.
 *
 * Design notes
 * ------------
 * - Lives in `mosaic-content-editor-plugin` rather than
 *   `mosaic-layouts` because the layouts package already depends
 *   on this one (via `useEditMode`); the reverse direction would
 *   close the cycle. Layout authors plug their keys IN, the
 *   editor consumes them OUT.
 *
 * - The context value is intentionally just `string[]` (not the
 *   full `{ name: FC }` record). The editor only needs the keys;
 *   shipping the actual components across the React tree would
 *   couple the editor bundle to the layouts implementation and
 *   defeat code-splitting.
 *
 * - Default value is `null` (not `[]`) so consumers can
 *   distinguish "no provider mounted" (fall back to free-text
 *   input — host hasn't opted in) from "provider mounted but no
 *   layouts registered" (still render the picker, just with an
 *   empty suggestion list — host *has* opted in but configured
 *   nothing). The two states differ visually and we don't want
 *   to merge them silently.
 */

import { createContext, FC, ReactNode, useContext, useMemo } from 'react';

/**
 * Context payload. We split `names` and `strict` rather than using
 * a discriminated union because consumers nearly always need only
 * one of them — `useLayoutNames()` returns the names directly so
 * existing call sites keep their shape, and the rare consumer that
 * cares about strictness uses the companion `useLayoutsAreStrict()`
 * hook.
 */
interface LayoutNamesValue {
  names: readonly string[];
  strict: boolean;
}

const LayoutNamesContext = createContext<LayoutNamesValue | null>(null);

export interface LayoutNamesProviderProps {
  /**
   * All layout component names available to the current host.
   * Pass `Object.keys(layoutComponents)` if you're integrating
   * with the `mosaic-layouts` `LayoutProvider`. Internal
   * filtering (e.g. dropping the special `EditLayout`) is the
   * provider's responsibility — this context holds the
   * **author-selectable** names verbatim.
   */
  names: readonly string[];
  /**
   * When `true`, the editor's layout picker rejects values not
   * in `names` (the field renders with `validationStatus="error"`
   * and the save dialog refuses to ship the frontmatter slice).
   *
   * Defaults to `false`, which surfaces unknown values as a soft
   * `warning` instead — the page still saves, the layout just
   * falls back to the host's default at render time. Soft is
   * the right default for the common case where a developer
   * has added a new layout but hasn't yet released the bump to
   * this plugin's deny-list / dropdown.
   *
   * Set `true` for sites that treat the layout name as a strict
   * enum (e.g. authoring-only deployments where unknown values
   * always indicate a typo, not a forward-compat issue).
   */
  strict?: boolean;
  children: ReactNode;
}

export const LayoutNamesProvider: FC<LayoutNamesProviderProps> = ({
  names,
  strict = false,
  children
}) => {
  // Memoise on the array's contents so a parent that recomputes
  // `Object.keys(...)` on every render doesn't ship a fresh
  // identity through the context (would re-render every
  // FrontmatterEditor row on every parent render). Sort+join
  // gives a cheap stable signature — layout names are short and
  // few (typically <20).
  const signature = names.slice().sort().join('|');
  const value = useMemo<LayoutNamesValue>(
    () => ({ names, strict }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature, strict]
  );
  return <LayoutNamesContext.Provider value={value}>{children}</LayoutNamesContext.Provider>;
};

/**
 * Read the host-registered layout names.
 *
 * Returns `null` when no `<LayoutNamesProvider>` is mounted — use
 * the null check at the call site to decide between "host opted in,
 * render the picker" and "host didn't, fall back to the default
 * widget for the field's JS type".
 */
export function useLayoutNames(): readonly string[] | null {
  return useContext(LayoutNamesContext)?.names ?? null;
}

/**
 * Whether unknown layout names should be rejected outright.
 * Returns `false` when no provider is mounted (the editor's
 * plain-text fallback never validates anyway, so the answer is
 * effectively "don't enforce anything"). See
 * {@link LayoutNamesProviderProps#strict} for what `true`
 * actually does.
 */
export function useLayoutsAreStrict(): boolean {
  return useContext(LayoutNamesContext)?.strict ?? false;
}
