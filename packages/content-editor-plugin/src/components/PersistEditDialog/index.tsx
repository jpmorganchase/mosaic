'use client';

/**
 * Save / Pull-Request dialog.
 *
 * Controlled via `open` / `onOpenChange` props from the parent (no
 * global page-state flag). The save itself calls a host-supplied
 * Server Action that streams progress events; the dialog consumes
 * the stream inside `useTransition` so the pending flag is driven by
 * React.
 */
import { FC, useState, useTransition } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $convertToMarkdownString } from '@lexical/markdown';
import { Link, P2, Button } from '@jpmorganchase/mosaic-components';
import { DialogHeader, DialogContent, DialogActions } from '@salt-ds/core';
import { SourceWorkflowMessageEvent } from '@jpmorganchase/mosaic-types';

import transformers from '../../transformers';
import { useSaveState } from '../../EditorContext';
import { PersistStatus } from './PersistStatus';
import { Dialog } from '../Dialog';
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
   * Host-supplied Server Action that streams progress events for a
   * save. Passed in so the plugin stays decoupled from any specific
   * Next app.
   */
  persist?: (input: {
    route: string;
    markdown: string;
  }) => Promise<AsyncIterable<PersistEvent>> | AsyncIterable<PersistEvent>;
}

export const PersistDialog = ({ open, onOpenChange, meta, persist }: PersistDialogProps) => {
  const [editor] = useLexicalComposerContext();
  const [isRaising, startTransition] = useTransition();
  const [prHref, setPrHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<SourceWorkflowMessageEvent[]>([]);
  const { markSaving, markSaved, markSaveFailed } = useSaveState();

  const state = prHref !== null ? 'success' : 'info';

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

    editor.update(() => {
      const markdown = $convertToMarkdownString(transformers);
      if (!markdown) {
        setError('Editor is empty — nothing to save.');
        return;
      }
      if (!meta.route) {
        setError('Page route is missing — cannot save.');
        return;
      }

      startTransition(async () => {
        markSaving();
        try {
          const stream = await persist({ route: meta.route as string, markdown });
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
