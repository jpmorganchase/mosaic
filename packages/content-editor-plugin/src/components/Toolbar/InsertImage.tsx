import React, { useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Button, Icon } from '@jpmorganchase/mosaic-components';
import { string, object } from 'yup';
import {
  Input,
  FormField,
  FormFieldLabel,
  FormFieldHelperText,
  DialogHeader,
  DialogContent,
  DialogActions
} from '@salt-ds/core';
import { ButtonBar } from '@salt-ds/lab';

import { ToolbarButton } from './ToolbarButton';
import { Dialog } from '../Dialog';
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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setValues(initialState);
    }
  };

  const handleOpen = () => setIsOpen(true);

  const handleClose = () => {
    handleOpenChange(false);
  };

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
      <ToolbarButton active={isOpen} onClick={handleOpen} label="Insert Image">
        <Icon name="addDocument" />
      </ToolbarButton>

      <Dialog onOpenChange={handleOpenChange} open={isOpen}>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader header="Insert Image" />
          <DialogContent>
            <div className={styles.fullWidth}>
              <FormField validationStatus={errors?.url ? 'error' : undefined}>
                <FormFieldLabel>Url for image</FormFieldLabel>
                <Input value={values?.url} inputProps={{ name: 'url' }} onChange={handleChange} />
                <FormFieldHelperText>{errors?.url}</FormFieldHelperText>
              </FormField>
              <FormField validationStatus={errors?.alt ? 'error' : undefined}>
                <FormFieldLabel>Alternative Information (alt)</FormFieldLabel>
                <Input value={values?.alt} inputProps={{ name: 'alt' }} onChange={handleChange} />
                <FormFieldHelperText>
                  {errors?.alt ||
                    'Provides alternative information for the image if for some reason it cannot be viewed'}
                </FormFieldHelperText>
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
    </>
  );
};
