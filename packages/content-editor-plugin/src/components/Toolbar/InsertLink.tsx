import React, { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Button, Icon } from '@jpmorganchase/mosaic-components';
import { string, object } from 'yup';
import {
  FormField,
  Input,
  ButtonBar,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@salt-ds/lab';
import { $getSelection, $isRangeSelection } from 'lexical';

import { ToolbarButton } from './ToolbarButton';
import { Dialog } from '../Dialog';
import { INSERT_MARKDOWN_LINK_COMMAND, InsertLinkPayload } from '../../plugins/MarkdownLinkPlugin';
import { useIsInsertingLink } from '../../store';
import styles from './InsertLink.css';

const validationSchema = object({
  url: string().required('Url is required'),
  text: string().required('Text is required').max(10, 'Text must be fewer than 100 characters')
});

export const InsertLinkButton = () => {
  const { isInsertingLink, setIsInsertingLink } = useIsInsertingLink();
  return (
    <ToolbarButton
      active={isInsertingLink}
      onClick={() => setIsInsertingLink(true)}
      label="Insert Link"
    >
      <Icon name="linked" />
    </ToolbarButton>
  );
};

const initialState = {
  url: 'https://'
};

type FormValueState =
  | {
      text?: string;
      url?: string;
    }
  | undefined;

type FormErrorState =
  | {
      text?: string;
      url?: string;
    }
  | undefined;

export const InsertLinkDialog = () => {
  const [editor] = useLexicalComposerContext();
  const { isInsertingLink, setIsInsertingLink } = useIsInsertingLink();
  const [values, setValues] = useState<FormValueState>(initialState);
  const [errors, setErrors] = useState<FormErrorState>();

  const handleClose = () => {
    setIsInsertingLink(false);
    setErrors(undefined);
    setValues(initialState);
  };

  useEffect(() => {
    editor.getEditorState().read(() => {
      if (isInsertingLink) {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const textContent = selection.getTextContent();
          setValues(values => ({ ...values, text: textContent }));
        }
      }
    });
  }, [editor, isInsertingLink]);

  const processErrors = validationErrors => {
    const newErrors = validationErrors.inner.reduce(
      (acc, { path, message }) => ({
        ...acc,
        [path]: message
      }),
      {}
    );
    setErrors(newErrors);
  };

  const handleChange = (event, value) => {
    const { name } = event.target;
    const newValues = { ...values, [name]: value };
    validationSchema.validateAt(name, newValues, { abortEarly: false }).then(() => {
      setErrors({ ...errors, [name]: undefined });
    }, processErrors);
    setValues(newValues);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    validationSchema.validate(values, { abortEarly: false }).then(() => {
      const payload: InsertLinkPayload = {
        url: values?.url,
        text: values?.text
      };
      editor.dispatchCommand(INSERT_MARKDOWN_LINK_COMMAND, payload);
      handleClose();
    }, processErrors);
  };

  return (
    <Dialog onClose={handleClose} open={isInsertingLink} width={600}>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>Insert Link</DialogTitle>
        <DialogContent>
          <div className={styles.fullWidth}>
            <FormField
              label="Image URL text"
              validationStatus={errors?.url ? 'error' : undefined}
              helperText={errors?.url}
            >
              <Input value={values?.url} inputProps={{ name: 'url' }} onChange={handleChange} />
            </FormField>
            <FormField
              label="Link text"
              validationStatus={errors?.text ? 'error' : undefined}
              helperText={errors?.text}
            >
              <Input value={values?.text} inputProps={{ name: 'text' }} onChange={handleChange} />
            </FormField>
          </div>
        </DialogContent>
        <DialogActions>
          <ButtonBar>
            <Button onClick={handleClose}>Cancel</Button>
            <Button variant="cta" type="submit">
              Insert
            </Button>
          </ButtonBar>
        </DialogActions>
      </form>
    </Dialog>
  );
};
