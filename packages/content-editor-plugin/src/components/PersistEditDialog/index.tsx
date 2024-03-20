import React, { FC, useState } from 'react';
import md5 from 'md5';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $convertToMarkdownString } from '@lexical/markdown';
import { Link, P2, Button } from '@jpmorganchase/mosaic-components';
import { DialogHeader, DialogContent, DialogActions } from '@salt-ds/core';
import { ButtonBar } from '@salt-ds/lab';
import { SourceWorkflowMessageEvent } from '@jpmorganchase/mosaic-types';

import { useEditorUser, usePageState } from '../../store';
import transformers from '../../transformers';
import { PersistStatus } from './PersistStatus';
import { Dialog } from '../Dialog';
import style from './index.css';
import useWorkflowFeed from '../../hooks/useWorkflowFeed';

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

interface PersistDialogProps {
  meta: any;
  persistUrl?: string;
}

export const PersistDialog = ({ meta, persistUrl }: PersistDialogProps) => {
  const { pageState, setPageState } = usePageState();
  const { user } = useEditorUser();
  const [editor] = useLexicalComposerContext();
  const [isRaising, setIsRaising] = useState(false);
  const [prHref, setPrHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<SourceWorkflowMessageEvent[]>([]);

  const open = pageState === 'SAVING';
  const state = prHref !== null ? 'success' : 'info';

  const handleOpenChange = (newOpen: boolean) => {
    setIsRaising(newOpen);
    if (!newOpen) {
      setPageState('EDIT');
      setPrHref(null);
      setProgress([]);
    }
  };

  const handleClose = () => {
    handleOpenChange(false);
  };

  const handleErrorMessage = (errorMessage: string) => {
    setError(errorMessage ? errorMessage : 'Sorry - an unexpected error has occurred');
    setPrHref(null);
    setProgress([]);
    setIsRaising(false);
  };

  const handleCompleteMessage = message => {
    setPrHref(message.message?.links?.self[0]?.href);
    setIsRaising(false);
  };

  const handleSuccessMessage = message => {
    setProgress(prevState => [...prevState, message]);
  };

  const { sendWorkflowProgressMessage } = useWorkflowFeed(
    open,
    handleErrorMessage,
    handleSuccessMessage,
    handleCompleteMessage
  );

  const handleRaisePr = () => {
    setIsRaising(true);
    setPrHref(null);
    setError(null);

    try {
      editor.update(() => {
        const markdown = $convertToMarkdownString(transformers);
        if (markdown && user && persistUrl) {
          const { sid, displayName, email } = user;

          sendWorkflowProgressMessage(
            JSON.stringify({
              user: { sid, name: displayName, email },
              route: meta.route,
              markdown,
              name: 'save'
            }),
            md5(`${sid.toLowerCase()} - save`)
          );
        }
      });
    } catch (e) {
      setError('Sorry - an unexpected error has occurred');
      setPrHref(null);
      setIsRaising(false);
      setProgress([]);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open} status={error ? 'error' : state}>
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
        <ButtonBar>
          <Button disabled={isRaising} onClick={handleClose}>
            {!prHref ? 'Cancel' : 'Done'}
          </Button>
          <Button
            disabled={persistUrl === undefined || isRaising || prHref !== null}
            onClick={handleRaisePr}
            variant="cta"
          >
            Raise Pull Request
          </Button>
        </ButtonBar>
      </DialogActions>
    </Dialog>
  );
};
