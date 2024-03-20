import React, { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Button, Icon } from '@jpmorganchase/mosaic-components';
import { string, object } from 'yup';
import {
  Input,
  FormField,
  FormFieldLabel,
  FormFieldHelperText,
  DialogContent,
  DialogActions,
  DialogHeader
} from '@salt-ds/core';
import { ButtonBar } from '@salt-ds/lab';
import { $getSelection, $isRangeSelection } from 'lexical';

import { ToolbarButton } from './ToolbarButton';
import { Dialog } from '../Dialog';
import { INSERT_MARKDOWN_LINK_COMMAND, InsertLinkPayload } from '../../plugins/MarkdownLinkPlugin';
import { useIsInsertingLink } from '../../store';
import styles from './InsertLink.css';

const validationSchema = object({
  url: string().required('Url is required'),
  text: string().required('Text is required').max(100, 'Text must be fewer than 100 characters')
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
  url: 'https://',
  text: ''
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

  const handleOpenChange = (open: boolean) => {
    setIsInsertingLink(open);
    if (!open) {
      setErrors(undefined);
      setValues(initialState);
    }
  };

  const handleClose = () => {
    handleOpenChange(false);
  };

  useEffect(() => {
    editor.getEditorState().read(() => {
      if (isInsertingLink) {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const textContent = selection.getTextContent();
          setValues(prevState => ({ ...prevState, text: textContent }));
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

  const handleChange = event => {
    const { name, value } = event.target;
    const newValues = { ...values, [name]: value };
    validationSchema.validateAt(name, newValues, { abortEarly: false }).then(() => {
      setErrors({ ...errors, [name]: undefined });
    }, processErrors);
    setValues(newValues);
  };

  const handleSubmit = async () => {
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
    <Dialog onOpenChange={handleOpenChange} open={isInsertingLink}>
      <DialogHeader header="Insert Link" />
      <DialogContent>
        <div className={styles.fullWidth}>
          <FormField validationStatus={errors?.url ? 'error' : undefined}>
            <FormFieldLabel>Image URL text</FormFieldLabel>
            <Input value={values?.url} inputProps={{ name: 'url' }} onChange={handleChange} />
            <FormFieldHelperText>{errors?.url}</FormFieldHelperText>
          </FormField>
          <FormField validationStatus={errors?.text ? 'error' : undefined}>
            <FormFieldLabel>Link Text</FormFieldLabel>
            <Input value={values?.text} inputProps={{ name: 'text' }} onChange={handleChange} />
            <FormFieldHelperText>{errors?.text}</FormFieldHelperText>
          </FormField>
        </div>
      </DialogContent>
      <DialogActions>
        <ButtonBar>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="cta" onClick={handleSubmit}>
            Insert
          </Button>
        </ButtonBar>
      </DialogActions>
    </Dialog>
  );
};
