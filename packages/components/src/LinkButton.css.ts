import { style } from '@vanilla-extract/css';
import { vars } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      display: 'inline-flex',
      alignItems: 'center',
      letterSpacing: '0.6px',
      fontWeight: vars.fontWeight.bold,
      fontSize: vars.fontSize.s50,
      lineHeight: '1.5em',
      paddingLeft: vars.space.horizontal.x2,
      paddingRight: vars.space.horizontal.x2,
      height: vars.component.button.web.height
    }
  ])
};
