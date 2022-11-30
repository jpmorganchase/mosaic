import { style } from '@vanilla-extract/css';
import { grid } from '@jpmorganchase/mosaic-theme';

export default {
  root: style({
    display: 'grid'
  }),
  small: grid({ size: 'small' }),
  medium: grid({ size: 'medium' }),
  large: grid({ size: 'large' }),
  fullWidth: grid({ size: 'fullWidth' }),
  fitContent: grid({ size: 'fitContent' })
};
