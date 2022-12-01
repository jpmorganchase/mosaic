import React from 'react';
import { Button, Icon } from '@jpmorganchase/mosaic-components';
import type { ButtonProps } from '@jpmorganchase/mosaic-components';

export const EditLinkButton = (props: ButtonProps) => (
  <Button {...props}>
    <Icon name="edit" />
  </Button>
);
