'use client';

/**
 * Save / Pull-Request dialog.
 *
 * Controlled via `open` / `onOpenChange` props from the parent
 * (no global page-state flag). The save itself calls a host-
 * supplied Server Action that streams progress events; the
 * dialog consumes the stream inside `useTransition` so the
 * pending flag is driven by React.
 *
 * On open the dialog snapshots the current markdown, the
 * authored frontmatter slice, and seeds the rename input from
 * `meta.route`. The snapshots drive both the "Review changes"
 * diff preview and the bytes sent to `persist` — so the diff
 * the user sees is exactly the diff the workflow writes.
 *
 * The dialog has no Lexical dependency of its own: markdown
 * comes in through a host-supplied `getCurrentMarkdown`
 * callback, so the dialog can be mounted outside the composer
 * (which is exactly where `Editor.tsx` puts it, so a single
 * instance survives WYSIWYG ↔ source mode flips).
 */
import { FC, useEffect, useMemo, useState, useTransition } from 'react';
import { Link, P2, Button } from '@jpmorganchase/mosaic-components';
import {
  Accordion,
  AccordionHeader,
  AccordionPanel,
  DialogHeader,
  DialogContent,
  DialogActions,
  Input
} from '@salt-ds/core';
import { SourceWorkflowMessageEvent } from '@jpmorganchase/mosaic-types';

import { useSaveState } from '../../EditorContext';
import { PersistStatus } from './PersistStatus';
import { Dialog } from '../Dialog';
import { Diff, useDiff } from './Diff';
import style from './index.css';

interface InfoProps {
  isRaising: boolean;
  prHref: string | null;
  error: string | null;
  /** When `true` the create-page wording is rendered. */
  isNewPage: boolean;
}

const Info: FC<InfoProps> = ({ isRaising, prHref, error, isNewPage }) =>
  !isRaising && !prHref && !error ? (
    isNewPage ? (
      <>
        <P2>
          A new page will be created via a Pull Request. The page won&apos;t be visible on the site
          until the PR is reviewed and merged.
        </P2>
        <br />
        <P2>
          Should you close this dialog before creating the Pull Request then the new page will not
          be saved.
        </P2>
      </>
    ) : (
      <>
        <P2>
          The content of this page resides in a Git repository and to update it requires a Pull
          Request which will be reviewed by the content owners.
        </P2>
        <br />
        <P2>
          Should you decide to stop editing before creating the Pull Request then all changes will
          be lost.
        </P2>
      </>
    )
  ) : null;

export type PersistEvent =
  | { kind: 'progress'; message: SourceWorkflowMessageEvent }
  | { kind: 'complete'; prHref: string | null }
  | { kind: 'error'; message: string };

export interface PersistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: { route?: string } & Record<string, unknown>;
  /**
   * The pristine on-disk markdown body (frontmatter already
   * stripped, matching what `$convertToMarkdownString` produces from
   * Lexical) that the editor was seeded with. Diffed against the
   * current editor markdown to render the "Review changes" preview.
   * Optional so the dialog stays usable from hosts that haven't yet
   * plumbed the original through; in that case the diff section
   * collapses to nothing.
   */
  originalMarkdown?: string;
  /**
   * Returns the current markdown body. Called once when the
   * dialog opens to capture a snapshot for both the diff
   * preview and the `persist` payload. The dialog has no
   * Lexical dependency of its own (it's mounted outside the
   * composer so it can survive WYSIWYG ↔ source mode flips),
   * so the host MUST plumb this through.
   *
   * Marked optional in the type to keep the API ergonomic; the
   * dialog defends against absence by surfacing a clear
   * "Editor is empty" message rather than crashing.
   */
  getCurrentMarkdown?: () => string;
  /**
   * Returns the current authored frontmatter as bare YAML (no
   * `---` fences), or `undefined` if the editor isn't in a state
   * where it can vouch for the authored slice (no raw source
   * available, parse error in the form, etc.). Called once on
   * dialog open alongside `getCurrentMarkdown` so the snapshot
   * stays consistent with the diff preview.
   *
   * When the snapshot is `undefined` the dialog omits the
   * `frontmatter` field from the persist payload — the workflow
   * then keeps the on-disk frontmatter verbatim, which is the
   * safe default for hosts that haven't surfaced frontmatter
   * editing.
   */
  getCurrentAuthoredFrontmatter?: () => string | undefined;
  /**
   * The pristine authored frontmatter (YAML, no fences) the
   * editor was seeded with. Diffed against the open-time snapshot
   * to decide whether to send `frontmatter` in the payload — if
   * unchanged we omit it so the workflow keeps using the on-disk
   * bytes verbatim and the resulting PR diff stays minimal.
   */
  originalAuthoredFrontmatter?: string;
  /**
   * Host-supplied Server Action that streams progress events for a
   * save. Passed in so the plugin stays decoupled from any specific
   * Next app.
   */
  persist?: (input: {
    route: string;
    markdown: string;
    /**
     * Authored frontmatter as bare YAML. Optional and additive:
     * older host implementations that destructure only
     * `{ route, markdown }` continue to work unchanged.
     */
    frontmatter?: string;
    /**
     * New VFS route for a file rename (Mosaic uses file-based
     * routing). Same additivity caveat as `frontmatter` — older
     * hosts ignore it and behaviour is unchanged.
     */
    targetRoute?: string;
    /**
     * Brand-new-page flag. When `true` the workflow treats
     * `route` as a create rather than an edit.
     */
    isNewPage?: boolean;
  }) => Promise<AsyncIterable<PersistEvent>> | AsyncIterable<PersistEvent>;
  /**
   * When `true` this dialog is for *creating* a new page
   * rather than editing an existing one:
   *   - the title becomes "Create Page",
   *   - the CTA becomes "Create Page",
   *   - the rename row is replaced with a read-only display of
   *     the route the user just chose (there's nothing to rename
   *     against — it's not on disk yet),
   *   - the diff preview is hidden (no `originalMarkdown` exists
   *     to compare against on a create),
   *   - the `isNewPage: true` flag is included in the persist
   *     payload so the workflow takes its create branch.
   */
  isNewPage?: boolean;
}

export const PersistDialog = ({
  open,
  onOpenChange,
  meta,
  originalMarkdown,
  getCurrentMarkdown,
  getCurrentAuthoredFrontmatter,
  originalAuthoredFrontmatter,
  persist,
  isNewPage = false
}: PersistDialogProps) => {
  const [isRaising, startTransition] = useTransition();
  const [prHref, setPrHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<SourceWorkflowMessageEvent[]>([]);
  // Snapshot of the editor's markdown captured when the dialog
  // opens; used both for the diff preview and as the exact payload
  // sent to `persist` so the user can't get a "but the diff said X"
  // surprise from typing a keystroke in the millisecond between
  // diff-render and submit. `undefined` while closed or on first
  // open before the snapshot effect runs.
  const [pendingMarkdown, setPendingMarkdown] = useState<string | undefined>(undefined);
  // Same idea for the authored frontmatter slice. `undefined`
  // means either (a) we haven't snapshotted yet, or (b) the host
  // didn't plumb `getCurrentAuthoredFrontmatter`, or (c) the
  // editor itself couldn't vouch for the slice (no raw source).
  // All three collapse to "don't send `frontmatter` in the
  // payload" — the workflow then keeps on-disk frontmatter
  // verbatim.
  const [pendingFrontmatter, setPendingFrontmatter] = useState<string | undefined>(undefined);
  /**
   * Rename target — a VFS path the user can edit in the dialog
   * to move the page (Mosaic uses file-based routing, so this
   * effectively changes the page's URL). Seeded to the current
   * route every time the dialog opens; an unchanged value is
   * omitted from the payload, so the workflow only sees a
   * `targetRoute` field when the user actually edited it.
   *
   * Kept as a string (not a discriminated `dirty` flag) so the
   * input stays controlled cleanly; the "did it change?" check
   * lives at submit time against `meta.route`.
   */
  const [targetRoute, setTargetRoute] = useState<string>('');
  const { markSaving, markSaved, markSaveFailed } = useSaveState();

  const state = prHref !== null ? 'success' : 'info';

  // Capture the editor's markdown once when the dialog transitions
  // from closed -> open (and we're not in a post-save state).
  // Mode-agnostic — relies only on the host-supplied
  // `getCurrentMarkdown` callback.
  useEffect(() => {
    if (!open) {
      setPendingMarkdown(undefined);
      setPendingFrontmatter(undefined);
      setTargetRoute('');
      return;
    }
    if (prHref !== null) return;
    if (!getCurrentMarkdown) return;
    setPendingMarkdown(getCurrentMarkdown());
    // Snapshot the authored frontmatter alongside the body so the
    // diff and the payload stay in lockstep. `undefined` is a
    // valid value (host didn't plumb it / editor can't vouch);
    // we record it explicitly so the submit branch can tell
    // "not snapshotted yet" from "snapshotted as absent".
    setPendingFrontmatter(
      getCurrentAuthoredFrontmatter ? getCurrentAuthoredFrontmatter() : undefined
    );
    // Seed the rename field from the current route every open —
    // the user might have closed the dialog without committing
    // an edit, so re-opening should start fresh from the
    // on-disk route rather than from abandoned typing.
    if (typeof meta.route === 'string') setTargetRoute(meta.route);
    // We deliberately omit `prHref` from the dep array: this effect
    // should only re-run on open transitions, not when the success
    // state changes (the snapshot taken at open is still the
    // correct one). `getCurrentMarkdown` is identity-stable per
    // the host's contract.
  }, [open, getCurrentMarkdown, getCurrentAuthoredFrontmatter, meta.route]);

  /**
   * Validation for the rename input. Cheap, run on every keystroke
   * (the input itself is tiny so debouncing isn't worth the
   * complexity). Returns `null` when the value is acceptable; a
   * human-readable string otherwise.
   *
   * Rules:
   *
   *   - Must be non-empty.
   *   - Must start with `/`. The on-disk paths are always
   *     leading-slash absolute; permitting both forms would let
   *     the user save what looks like a sibling-path rename
   *     ("foo.mdx") that actually resolves under the source's
   *     prefixDir root — surprising.
   *   - Must keep the file extension (`.mdx`, `.md`, `.json`,
   *     etc.) — Mosaic uses the extension to pick a serialiser,
   *     so changing it silently would break the page.
   *   - Reject characters that can't appear in a valid
   *     POSIX path on any filesystem we care about.
   *   - Same-as-current is fine; the submit path just omits the
   *     payload field in that case.
   */
  const renameError = useMemo<string | null>(() => {
    if (typeof meta.route !== 'string') return null; // nothing to validate against
    const value = targetRoute;
    if (value === meta.route) return null;
    if (value.length === 0) return 'Path cannot be empty.';
    if (!value.startsWith('/')) return 'Path must start with /.';
    // Intentional control-char range: NUL..US are illegal in POSIX/Windows
    // filenames; reject early instead of letting the workflows layer fail.
    // eslint-disable-next-line no-control-regex
    if (/[\s<>:"|?*\x00-\x1f]/.test(value)) return 'Path contains invalid characters.';
    if (value.endsWith('/')) return 'Path must end with a file name.';
    const origExt = meta.route.match(/\.[^./]+$/)?.[0] ?? '';
    const newExt = value.match(/\.[^./]+$/)?.[0] ?? '';
    if (origExt && newExt !== origExt) {
      return `File extension must stay ${origExt} (Mosaic picks the serialiser by extension).`;
    }
    return null;
  }, [targetRoute, meta.route]);

  /**
   * Gate for the "Raise Pull Request" CTA. The dialog can be
   * opened against a clean document (so authors can reach the
   * rename input without making a throwaway edit), but the CTA
   * must still refuse a no-op payload — otherwise the workflow
   * clones the repo, rewrites the file identically, and trips
   * on an empty commit.
   *
   * Returns `true` when ANY of:
   *   - the body snapshot differs from `originalMarkdown`
   *     (with trailing-whitespace normalisation — see below);
   *   - the frontmatter snapshot differs from
   *     `originalAuthoredFrontmatter`;
   *   - `targetRoute` differs from `meta.route` and validates.
   *
   * If the host didn't plumb `originalMarkdown` we can't tell,
   * so we permit the submit and let the workflow's own diffing
   * decide.
   */
  const hasChangesToSubmit = useMemo<boolean>(() => {
    // Create-page mode: the only "change" check that makes
    // sense is "did the author write *something*?". They got to
    // this dialog from the New-Page modal which already
    // collected a title (→ frontmatter) and a route, so the
    // typical state at first open is "body empty, frontmatter
    // populated", which is enough to commit. Require either
    // body or frontmatter to be non-empty so we don't ship a
    // literal empty file to the workflow.
    if (isNewPage) {
      const hasBody = !!pendingMarkdown && pendingMarkdown.trim().length > 0;
      const hasFrontmatter =
        typeof pendingFrontmatter === 'string' && pendingFrontmatter.trim().length > 0;
      return hasBody || hasFrontmatter;
    }
    // Body delta. Trailing-whitespace is normalised because the
    // baseline comes from gray-matter (preserves the file's
    // trailing newline) while the snapshot comes from Lexical's
    // `$convertToMarkdownString` (its own opinion). Comparing
    // raw strings would enable the CTA on a freshly-opened page
    // with no real edits.
    const normaliseBody = (s: string) => s.replace(/\r\n/g, '\n').replace(/\s+$/, '');
    if (
      originalMarkdown !== undefined &&
      pendingMarkdown !== undefined &&
      normaliseBody(pendingMarkdown) !== normaliseBody(originalMarkdown)
    ) {
      return true;
    }
    // Frontmatter delta — only meaningful when both sides exist.
    if (
      pendingFrontmatter !== undefined &&
      originalAuthoredFrontmatter !== undefined &&
      pendingFrontmatter !== originalAuthoredFrontmatter
    ) {
      return true;
    }
    // Rename delta — value differs from baseline and validates.
    if (
      typeof meta.route === 'string' &&
      targetRoute !== '' &&
      targetRoute !== meta.route &&
      renameError === null
    ) {
      return true;
    }
    // Host didn't plumb the baseline → we can't tell, allow it.
    if (originalMarkdown === undefined) return true;
    return false;
  }, [
    isNewPage,
    pendingMarkdown,
    originalMarkdown,
    pendingFrontmatter,
    originalAuthoredFrontmatter,
    targetRoute,
    meta.route,
    renameError
  ]);

  const resetAndClose = () => {
    // Suppress close-while-saving so the user can't navigate away
    // mid-flight; the in-flight transition would still resolve and
    // try to setState on an unmounted dialog.
    if (isRaising) return;
    setPrHref(null);
    setError(null);
    setProgress([]);
    onOpenChange(false);
  };

  const handleRaisePr = () => {
    if (!persist) {
      setError('Save is not configured for this app.');
      return;
    }
    setPrHref(null);
    setError(null);
    setProgress([]);

    // Use the snapshot captured at dialog-open time so the bytes
    // diffed are the bytes saved. Fall back to a fresh read if the
    // snapshot effect somehow hasn't populated yet (e.g. parent
    // mounted the dialog already-open on first render).
    let markdown = pendingMarkdown;
    if (markdown === undefined && getCurrentMarkdown) {
      markdown = getCurrentMarkdown();
    }
    // Empty-body guard. For an edit, an empty body is a strong
    // signal the user wiped the page by mistake — bail loudly.
    // For a create, the body genuinely might be empty (a new
    // page with frontmatter-only is a legitimate landing-page
    // pattern), so accept whatever we have, defaulting to '' so
    // the workflow's mdx serialiser writes an empty body rather
    // than the literal string "undefined".
    if (!markdown) {
      if (isNewPage) {
        markdown = '';
      } else {
        setError('Editor is empty — nothing to save.');
        return;
      }
    }
    if (!meta.route) {
      setError('Page route is missing — cannot save.');
      return;
    }
    const route = meta.route as string;
    const payload = markdown;

    // Decide whether to send the authored frontmatter alongside
    // the body. Rules, in priority order:
    //
    //   1. If the snapshot is `undefined` we never send it — the
    //      editor (or the host) signalled "I can't vouch for the
    //      authored slice", so the workflow's on-disk fallback
    //      is the correct behaviour.
    //   2. If the snapshot matches `originalAuthoredFrontmatter`
    //      (byte-for-byte) we also omit it — the author didn't
    //      change frontmatter, so any difference between the
    //      snapshot's re-serialisation and the on-disk bytes
    //      (key ordering, quoting style) shouldn't leak into
    //      the PR diff.
    //   3. Otherwise we send it.
    let frontmatterPayload: string | undefined;
    if (pendingFrontmatter !== undefined) {
      if (
        originalAuthoredFrontmatter === undefined ||
        pendingFrontmatter !== originalAuthoredFrontmatter
      ) {
        frontmatterPayload = pendingFrontmatter;
      }
    }

    // Rename payload: only include when the user actually edited
    // the path and validation passed. We block submission entirely
    // when validation fails (Save button is disabled), so reaching
    // here with `renameError !== null` would be a bug — but we
    // double-check to be defensive against future changes.
    //
    // Skipped entirely in create-page mode — there's no baseline
    // route to rename *from*, and the chosen route is already in
    // `route` above.
    let targetRoutePayload: string | undefined;
    if (!isNewPage && renameError === null && targetRoute !== '' && targetRoute !== route) {
      targetRoutePayload = targetRoute;
    }

    startTransition(async () => {
      markSaving();
      try {
        const stream = await persist({
          route,
          markdown: payload,
          ...(frontmatterPayload !== undefined ? { frontmatter: frontmatterPayload } : {}),
          ...(targetRoutePayload !== undefined ? { targetRoute: targetRoutePayload } : {}),
          ...(isNewPage ? { isNewPage: true } : {})
        });
        let sawError = false;
        for await (const event of stream) {
          if (event.kind === 'progress') {
            // Functional update so the callback doesn't capture
            // a stale `progress` array.
            setProgress(prev => [...prev, event.message]);
          } else if (event.kind === 'complete') {
            setPrHref(event.prHref);
          } else if (event.kind === 'error') {
            sawError = true;
            setError(event.message || 'Sorry - an unexpected error has occurred');
            markSaveFailed();
            return;
          }
        }
        if (!sawError) markSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sorry - an unexpected error has occurred');
        markSaveFailed();
      }
    });
  };

  return (
    <Dialog onOpenChange={resetAndClose} open={open} status={error ? 'error' : state}>
      <DialogHeader
        className={style.title}
        header={
          prHref ? 'Pull Request Created Successfully' : isNewPage ? 'Create Page' : 'Save Changes'
        }
      />
      <DialogContent>
        {(isRaising || error) && !prHref && <PersistStatus error={error} progress={progress} />}
        <Info isRaising={isRaising} prHref={prHref} error={error} isNewPage={isNewPage} />
        {/*
          Rename row (edit mode only): only show in the pre-save /
          no-error state, and only when the host wired a route
          through `meta.route`.

          Create mode (`isNewPage`) renders a read-only display of
          the chosen route instead — there's nothing to rename
          against (the file doesn't exist yet) and the route was
          already picked by the author in the New-Page dialog.
        */}
        {!isRaising &&
          !prHref &&
          !error &&
          typeof meta.route === 'string' &&
          (isNewPage ? (
            <div className={style.renameRow}>
              <span className={style.renameLabel}>File path</span>
              <code>{meta.route}</code>
              <span className={style.renameHint}>The new page will be created at this path.</span>
            </div>
          ) : (
            <div className={style.renameRow}>
              <label className={style.renameLabel} htmlFor="mosaic-rename-input">
                File path
              </label>
              <Input
                id="mosaic-rename-input"
                value={targetRoute}
                onChange={e => setTargetRoute((e.target as HTMLInputElement).value)}
                placeholder={meta.route}
                spellCheck={false}
              />
              {renameError ? (
                <span className={style.renameError} role="alert">
                  {renameError}
                </span>
              ) : targetRoute !== meta.route && targetRoute !== '' ? (
                <span className={style.renameHint}>
                  The file will be renamed from <code>{meta.route}</code> to{' '}
                  <code>{targetRoute}</code> in the same Pull Request.
                </span>
              ) : (
                <span className={style.renameHint}>
                  Mosaic uses file-based routing — editing the path moves the page.
                </span>
              )}
            </div>
          ))}
        {/*
          Diff preview: edit mode only. Skipped entirely in
          create mode because there's no `originalMarkdown` to
          compare against (the file is brand-new).
        */}
        {!isNewPage &&
          !isRaising &&
          !prHref &&
          !error &&
          originalMarkdown !== undefined &&
          pendingMarkdown !== undefined && (
            <DiffSection original={originalMarkdown} updated={pendingMarkdown} />
          )}
        {!isRaising && prHref && (
          <Link href={prHref} target="_blank">
            A Pull Request for your changes has been created
          </Link>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={isRaising} onClick={resetAndClose}>
          {!prHref ? 'Cancel' : 'Done'}
        </Button>
        <Button
          disabled={
            persist === undefined ||
            isRaising ||
            prHref !== null ||
            renameError !== null ||
            !hasChangesToSubmit
          }
          onClick={handleRaisePr}
          variant="cta"
        >
          {isNewPage ? 'Create Page' : 'Raise Pull Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Internal: renders either "No changes" inline or an Accordion
 * containing the unified diff. Extracted so the diff hook is only
 * called when both markdown snapshots are present — keeping it
 * inside the parent's render would require the hook to handle the
 * `undefined` case, which is more confusing than the early-return
 * gate at the call site.
 */
const DiffSection: FC<{ original: string; updated: string }> = ({ original, updated }) => {
  const { lines, stats } = useDiff(original, updated);
  if (stats.unchanged) {
    return <P2 className={style.noChanges}>No changes — the editor matches the saved file.</P2>;
  }
  // The accordion is uncontrolled (defaultExpanded=false) — users
  // who want to glance at the diff before raising a PR open it
  // themselves; users who trust their edits aren't paying for a
  // tall pre-element on dialog open.
  return (
    <Accordion className={style.diffAccordion}>
      <AccordionHeader>
        Review changes (<span className={style.statAdd}>+{stats.added}</span>{' '}
        <span className={style.statRemove}>−{stats.removed}</span>)
      </AccordionHeader>
      <AccordionPanel>
        <Diff lines={lines} />
      </AccordionPanel>
    </Accordion>
  );
};
