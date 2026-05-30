'use client';

/**
 * Save / Pull-Request dialog.
 *
 * Controlled via `open` / `onOpenChange` props from the parent (no
 * global page-state flag). The save itself calls a host-supplied
 * Server Action that streams progress events; the dialog consumes
 * the stream inside `useTransition` so the pending flag is driven by
 * React.
 *
 * Phase 9 added a "Review changes" accordion above the actions: when
 * the dialog is opened in the pre-save state, we snapshot the
 * current markdown and diff it against the on-disk
 * `originalMarkdown`. The snapshot is taken once per open so the
 * diff can't drift while the dialog is on screen — and the same
 * bytes that get diffed are the bytes sent to `persist`.
 *
 * Phase 10 lifted markdown access out of `useLexicalComposerContext`:
 * the dialog now reads the current markdown via a host-supplied
 * `getCurrentMarkdown` callback. WYSIWYG hosts plug in a Lexical
 * read; source-mode hosts plug in a textarea read. The dialog
 * itself stays mode-agnostic and (importantly) mountable outside
 * the Lexical composer, which is exactly where `Editor.tsx` puts
 * it so a single dialog instance survives mode flips.
 */
import { FC, useEffect, useState, useTransition } from 'react';
import { Link, P2, Button } from '@jpmorganchase/mosaic-components';
import {
  Accordion,
  AccordionHeader,
  AccordionPanel,
  DialogHeader,
  DialogContent,
  DialogActions
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
}

const Info: FC<InfoProps> = ({ isRaising, prHref, error }) =>
  !isRaising && !prHref && !error ? (
    <>
      <P2>
        The content of this page resides in a Git repository and to update it requires a Pull
        Request which will be reviewed by the content owners.
      </P2>
      <br />
      <P2>
        Should you decide to stop editing before creating the Pull Request then all changes will be
        lost.
      </P2>
    </>
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
   * Returns the current markdown body. Called once when the dialog
   * opens to capture a snapshot for both the diff preview and the
   * `persist` payload. The dialog has no Lexical dependency of its
   * own (it's mounted outside the composer so it can survive
   * Phase-10 mode flips), so the host MUST plumb this through.
   *
   * Marked optional in the type to keep the API ergonomic; the
   * dialog defends against it being missing by surfacing a clear
   * "Editor is empty" message rather than crashing.
   */
  getCurrentMarkdown?: () => string;
  /**
   * Host-supplied Server Action that streams progress events for a
   * save. Passed in so the plugin stays decoupled from any specific
   * Next app.
   */
  persist?: (input: {
    route: string;
    markdown: string;
  }) => Promise<AsyncIterable<PersistEvent>> | AsyncIterable<PersistEvent>;
}

export const PersistDialog = ({
  open,
  onOpenChange,
  meta,
  originalMarkdown,
  getCurrentMarkdown,
  persist
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
  const { markSaving, markSaved, markSaveFailed } = useSaveState();

  const state = prHref !== null ? 'success' : 'info';

  // Capture the editor's markdown once when the dialog transitions
  // from closed -> open (and we're not in a post-save state).
  // Mode-agnostic — relies only on the host-supplied
  // `getCurrentMarkdown` callback.
  useEffect(() => {
    if (!open) {
      setPendingMarkdown(undefined);
      return;
    }
    if (prHref !== null) return;
    if (!getCurrentMarkdown) return;
    setPendingMarkdown(getCurrentMarkdown());
    // We deliberately omit `prHref` from the dep array: this effect
    // should only re-run on open transitions, not when the success
    // state changes (the snapshot taken at open is still the
    // correct one). `getCurrentMarkdown` is identity-stable per
    // the host's contract.
  }, [open, getCurrentMarkdown]);

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
    if (!markdown) {
      setError('Editor is empty — nothing to save.');
      return;
    }
    if (!meta.route) {
      setError('Page route is missing — cannot save.');
      return;
    }
    const route = meta.route as string;
    const payload = markdown;

    startTransition(async () => {
      markSaving();
      try {
        const stream = await persist({ route, markdown: payload });
        let sawError = false;
        for await (const event of stream) {
          if (event.kind === 'progress') {
            // Functional update so the callback doesn't capture a
            // stale `progress` array (rule rerender-functional-setstate).
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
        header={!prHref ? 'Save Changes' : 'Pull Request Created Successfully'}
      />
      <DialogContent>
        {(isRaising || error) && !prHref && <PersistStatus error={error} progress={progress} />}
        <Info isRaising={isRaising} prHref={prHref} error={error} />
        {/*
          Diff preview: show only in the pre-save state (not while
          raising, not after success, not after error) so the dialog
          doesn't grow a tall expandable section over a status
          message that's the user's actual focus. Skipped entirely
          when the host hasn't passed `originalMarkdown` (older
          integrations).
        */}
        {!isRaising &&
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
          disabled={persist === undefined || isRaising || prHref !== null}
          onClick={handleRaisePr}
          variant="cta"
        >
          Raise Pull Request
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
