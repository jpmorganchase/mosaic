import { style } from '@vanilla-extract/css';
import { vars, code } from '@jpmorganchase/mosaic-theme';

export default {
  icon: style({
    width: '14px',
    fontSize: '12px'
  }),
  bold: style({ fontWeight: vars.fontWeight.bold }),
  italic: style({ fontStyle: 'italic' }),
  code: style([
    code({ variant: 'regular' }),
    style({
      width: '22px',
      height: '18px',
      backgroundColor: 'inherit!important',
      display: 'inline-flex',
      justifyContent: 'center',
      alignItems: 'center'
    })
  ])
};
