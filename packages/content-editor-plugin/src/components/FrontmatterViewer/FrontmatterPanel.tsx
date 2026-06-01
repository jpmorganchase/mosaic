'use client';

/**
 * Front-matter mode entry point. Chooses between:
 *
 *   - `FrontmatterEditor` — the editable form, used when the
 *     host supplied raw on-disk bytes (`rawSource.kind === 'raw'`).
 *     Edits round-trip through the persist payload and end up in
 *     the PR diff.
 *
 *   - `FrontmatterViewer` — the read-only YAML pane, used in
 *     every other case (snapshot mode, unsupported source kind,
 *     virtual / synthesised pages, no `rawSource` at all). Edits
 *     would have nowhere to land safely, so the viewer surfaces
 *     a per-kind banner explaining why and falls back to
 *     displaying the post-plugin enriched view.
 *
 * Picking the variant here (rather than branching inside the
 * editor) keeps each component focused: the editor never has
 * to handle a "you can't actually save" state, and the viewer
 * never needs to know about form state, snapshot refs, or any
 * of the save-side plumbing.
 */

import { useMemo } from 'react';
import matter from 'gray-matter';

import type { RawSourceInput } from '../Editor';
import { FrontmatterEditor } from './FrontmatterEditor';
import { FrontmatterViewer } from './FrontmatterViewer';

export interface FrontmatterPanelProps {
  /**
   * Post-plugin enriched frontmatter. Passed straight through to
   * the viewer fallback; ignored by the editor branch (which
   * works against `rawSource.bytes`).
   */
  meta: Record<string, unknown> | undefined;
  rawSource?: RawSourceInput;
  /**
   * Snapshot getter installed by the editor (only used in the
   * editable branch). Wired in by the parent so the save dialog
   * can read the current YAML at submit time without lifting
   * form state out of `FrontmatterEditor`.
   */
  snapshotRef: React.RefObject<(() => string | undefined) | null>;
  /**
   * Baseline YAML the editor was seeded with (parent owns the
   * ref; editor populates it on mount). Used by the save dialog
   * for the "did the author actually change anything?" check.
   */
  originalYamlRef: React.RefObject<string>;
  /**
   * Forwarded to `FrontmatterEditor`; see its prop docs. Hosts
   * can pass a wider list (e.g. add `description` for SEO) or
   * `[]` to opt out. Default — applied inside the editor — is
   * `['title', 'layout']`.
   */
  requiredKeys?: readonly string[];
}

export const FrontmatterPanel = ({
  meta,
  rawSource,
  snapshotRef,
  originalYamlRef,
  requiredKeys
}: FrontmatterPanelProps) => {
  // Parse the raw bytes once per `rawSource` change so the editor
  // gets a stable `initial` object across re-renders. Keeping this
  // in `useMemo` (rather than inside the editor) also means the
  // viewer fallback never pays for the parse.
  const parsedRaw = useMemo(() => {
    if (rawSource?.kind !== 'raw') return null;
    try {
      const { data } = matter(rawSource.bytes);
      return (data ?? {}) as Record<string, unknown>;
    } catch (e) {
      console.warn('[mosaic-content-editor] Failed to parse raw frontmatter:', e);
      return null;
    }
  }, [rawSource]);

  if (rawSource?.kind === 'raw' && parsedRaw !== null) {
    const pillLabel = rawSource.namespace
      ? `On-disk source · ${rawSource.namespace}`
      : 'On-disk source';
    return (
      <FrontmatterEditor
        initial={parsedRaw}
        pillLabel={pillLabel}
        snapshotRef={snapshotRef}
        originalYamlRef={originalYamlRef}
        requiredKeys={requiredKeys}
      />
    );
  }

  // Fallback — viewer handles all "raw not available / parse
  // failed" cases with its existing per-kind banner copy.
  return <FrontmatterViewer meta={meta} rawSource={rawSource} />;
};
