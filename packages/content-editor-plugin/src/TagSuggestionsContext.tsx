'use client';

/**
 * Shared registry of tag values the running host has seen elsewhere
 * in the site, surfaced into the Frontmatter editor as ComboBox
 * suggestions for the `tags` field.
 *
 * Populated by the host (which is the only side of the wall that
 * can enumerate the site's actual tag vocabulary — see "Where the
 * names come from" below) and consumed by the editor's
 * `FrontmatterEditor` so authors get autocomplete instead of
 * having to remember the exact spelling of every existing tag.
 *
 * Design notes
 * ------------
 * - Parallels {@link LayoutNamesContext} deliberately. The editor
 *   already has the "host opted in → render typeahead; didn't →
 *   free-text fallback" pattern for the `layout` field; tags get
 *   the same shape so there's one mental model to learn and the
 *   `RowWidget` dispatch stays consistent.
 *
 * - Suggestions are **always non-binding**. Unlike layouts —
 *   where an unknown name produces a broken render and the host
 *   may want to enforce strictness — tags are free-form
 *   metadata. A new tag the author invents today is a perfectly
 *   valid tag tomorrow; the editor must let it through without
 *   warnings. That's why this context has no `strict` flag and
 *   the matching ComboBox is wired to accept unknown values.
 *
 * - The context value is `readonly string[] | null` for the same
 *   reason as `LayoutNamesContext`: `null` means "no provider
 *   mounted, render the free-text fallback", `[]` means "provider
 *   mounted but the host knows of zero tags so far" (still render
 *   the picker — the dropdown is just empty and authors type
 *   away). Collapsing the two states would hide the host's
 *   integration choice.
 *
 * Where the names come from (host responsibility)
 * -----------------------------------------------
 * The editor bundle deliberately doesn't know how to enumerate
 * tags — that would require talking to the Mosaic snapshot or
 * filesystem server, which is the host's job. Recommended sources
 * in order of fidelity:
 *
 *   1. **Mosaic filesystem listing** (active mode). Tags surface
 *      as `/.tags/<tag>/...` symlinks in the union FS, produced
 *      by `$TagPlugin`. A host that has read access to the FS
 *      HTTP endpoint can list `/.tags` and pass the directory
 *      names straight through.
 *
 *   2. **Snapshot index** (snapshot / static export). The host
 *      already ships a `mosaic-data.json` or equivalent — collect
 *      the union of every page's `tags` field at build time and
 *      pass it down.
 *
 *   3. **Hardcoded vocabulary**. Sites with a curated tag
 *      taxonomy (e.g. "platform", "blog", "internal") can just
 *      pass a literal array — the suggestions are still useful
 *      even when authors are allowed to invent new tags
 *      alongside the canonical set.
 *
 * Hosts that don't want to opt in simply skip mounting the
 * provider; the editor falls back to free-text input and nothing
 * changes for them.
 */

import { createContext, FC, ReactNode, useContext, useMemo } from 'react';

const TagSuggestionsContext = createContext<readonly string[] | null>(null);

export interface TagSuggestionsProviderProps {
  /**
   * All tag names the host knows about. Order is preserved in
   * the ComboBox suggestion list (the editor does NOT re-sort),
   * so pass a sorted/curated array if you want a specific
   * presentation — e.g. most-used first, or alphabetised.
   *
   * Pass an empty array to opt in without any suggestions (the
   * picker still renders, just with no dropdown options). Pass a
   * fresh identity per render is fine — the provider memoises
   * internally on a stable signature derived from the array
   * contents so consumers don't churn.
   */
  tags: readonly string[];
  children: ReactNode;
}

export const TagSuggestionsProvider: FC<TagSuggestionsProviderProps> = ({ tags, children }) => {
  // Memoise on the array's contents (sort+join) so a parent that
  // recomputes `tags` per render — e.g. one that derives them
  // from `useMemo(() => snapshot.pages.flatMap(p => p.tags), …)`
  // and gets a fresh identity whenever the snapshot reseats —
  // doesn't ship a new context value through to every
  // FrontmatterEditor row on every render. Tag lists are
  // typically short (tens to low hundreds); the signature cost
  // is well below the avoided re-render cost.
  const signature = tags.slice().sort().join('|');
  // Key the memo off the content signature, not the array identity,
  // so a parent that allocates a fresh `tags` array each render
  // doesn't reseat the context value and force every consumer to
  // re-run effects keyed on the hook's return value.
  const value = useMemo<readonly string[]>(() => tags, [signature]);
  return <TagSuggestionsContext.Provider value={value}>{children}</TagSuggestionsContext.Provider>;
};

/**
 * Read the host-registered tag suggestion list.
 *
 * Returns `null` when no `<TagSuggestionsProvider>` is mounted —
 * use the null check at the call site to decide between "host
 * opted in, render the ComboBox" and "host didn't, fall back to
 * the simpler input". See the file-level doc comment for what
 * the host is expected to pass when opting in.
 */
export function useTagSuggestions(): readonly string[] | null {
  return useContext(TagSuggestionsContext);
}
