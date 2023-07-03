import React, { FC, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $convertToMarkdownString } from '@lexical/markdown';
import { Link, P2, Button } from '@jpmorganchase/mosaic-components';
import { ButtonBar, DialogTitle, DialogContent, DialogActions } from '@salt-ds/lab';

import { useEditorUser, usePageState } from '../../store';
import { save } from '../../api/save';
import transformers from '../../transformers';
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

  const open = pageState === 'SAVING';
  const state = prHref !== null ? 'success' : 'info';

  const handleClose = () => {
    setPageState('EDIT');
    setPrHref(null);
    setIsRaising(false);
  };

  const handleRaisePr = () => {
    setIsRaising(true);
    setPrHref(null);
    setError(null);
    try {
      editor.update(async () => {
        const markdown = $convertToMarkdownString(transformers);
        if (markdown && user && persistUrl) {
          const { sid, displayName, email } = user;
          const response = await save(
            { sid, name: displayName, email },
            meta.route,
            markdown,
            persistUrl
          );

          if (response.ok) {
            const data = await response.json();
            if (data.error) {
              setError(data.error);
              setPrHref(null);
              setIsRaising(false);
            } else {
              setPrHref(data?.links?.self[0]?.href);
              setIsRaising(false);
            }
          }

          if (response.status === 500 || response.status === 404) {
            const errorText = await response.text();
            setError(errorText);
            setPrHref(null);
            setIsRaising(false);
          }
        }
      });
    } catch (e) {
      setError('Sorry - an unexpected error has occurred');
      setPrHref(null);
      setIsRaising(false);
    }
  };

  return (
    <Dialog onClose={handleClose} open={open} status={error ? 'error' : state}>
      <DialogTitle className={style.title}>
        {!prHref ? 'Save Changes' : 'Pull Request Created Successfully'}
      </DialogTitle>
      <DialogContent>
        {(isRaising || error) && !prHref && <PersistStatus isRaising={isRaising} error={error} />}
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
