import { style } from '@vanilla-extract/css';
import { vars, code } from '@jpmorganchase/mosaic-theme';

export default {
  // Salt wraps all Tooltray items in a Formfields which adds default padding
  // Tooltray needs refactoring so the user can compose Formfields themselves.
  root: style({
    margin: '-8px 0px 0px 0px'
  }),
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
