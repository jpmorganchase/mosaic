import React from 'react';
import { Icon } from '@jpmorganchase/mosaic-components';
import { ToolbarButton, type ToolbarButtonProps } from '../Toolbar/ToolbarButton';

export const EditLinkButton = (props: ToolbarButtonProps) => (
  <ToolbarButton {...props} aria-label="Edit link" disableTooltip variant="regular">
    <Icon name="edit" />
  </ToolbarButton>
);
