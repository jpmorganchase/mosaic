import { Icon } from '@jpmorganchase/mosaic-components';
import type { ButtonProps } from '@jpmorganchase/mosaic-components';
import { ToolbarButton } from '../Toolbar/ToolbarButton';

interface SaveAdornmentProps {
  onSave: ButtonProps['onClick'];
}

export const SaveAdornment = ({ onSave }: SaveAdornmentProps) => (
  <ToolbarButton onClick={onSave} aria-label="save link changes" disableTooltip variant="regular">
    <Icon name="save" />
  </ToolbarButton>
);
