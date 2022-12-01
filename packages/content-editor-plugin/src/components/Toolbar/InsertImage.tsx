import React, { useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Button, Icon } from '@jpmorganchase/mosaic-components';
import { string, object } from 'yup';
import {
  ButtonBar,
  Dialog as ToolkitDialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@jpmorganchase/uitk-lab';
import { FormField, Input } from '@jpmorganchase/uitk-core';

import { TextFormatToolbarButton } from './TextFormatToolbarButton';
import {
  INSERT_MARKDOWN_IMAGE_COMMAND,
  InsertImagePayload
} from '../../plugins/MarkdownImagePlugin';
import styles from './InsertImage.css';

const validationSchema = object({
  alt: string()
    .required('Alternative Information is a required field')
    .max(100, 'Alternative Information must be fewer than 100 characters'),
  url: string().required('Url is required').url('Must be a valid Url')
});

const initialState = {
  url: 'https://'
};

type FormValueState =
  | {
      alt?: string;
      url?: string;
    }
  | undefined;

type FormErrorState =
  | {
      alt?: string;
      url?: string;
    }
  | undefined;

export const InsertImage = () => {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<FormValueState>(initialState);
  const [errors, setErrors] = useState<FormErrorState>();

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOpen = () => setIsOpen(true);

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
      const payload: InsertImagePayload = {
        alt: values && values.alt !== undefined ? values.alt : null,
        url: values && values.url !== undefined ? values.url : null
      };
      editor.dispatchCommand(INSERT_MARKDOWN_IMAGE_COMMAND, payload);
      handleClose();
    }, processErrors);
  };

  return (
    <>
      <TextFormatToolbarButton active={isOpen} onClick={handleOpen} label="Insert Image">
        <Icon name="addDocument" />
      </TextFormatToolbarButton>

      <ToolkitDialog onClose={handleClose} open={isOpen} width={600}>
        <form onSubmit={handleSubmit} noValidate>
          <DialogTitle>Insert Image</DialogTitle>
          <DialogContent>
            <div className={styles.fullWidth}>
              <FormField
                label="Url for image"
                validationStatus={errors?.url ? 'error' : undefined}
                helperText={errors?.url}
              >
                <Input value={values?.url} inputProps={{ name: 'url' }} onChange={handleChange} />
              </FormField>
              <FormField
                label="Alternative Information (alt)"
                validationStatus={errors?.alt ? 'error' : undefined}
                helperText={
                  errors?.alt ||
                  'Provides alternative information for the image if for some reason it cannot be viewed'
                }
              >
                <Input value={values?.alt} inputProps={{ name: 'alt' }} onChange={handleChange} />
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
      </ToolkitDialog>
    </>
  );
};
