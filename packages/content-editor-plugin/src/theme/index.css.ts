import { style } from '@vanilla-extract/css';
import {
  vars,
  link,
  blockquote,
  table,
  td,
  th,
  tr,
  neutralBorder,
  paragraph
} from '@jpmorganchase/mosaic-theme';

export default {
  bold: style({ fontWeight: vars.fontWeight.bold }),
  italic: style({ fontStyle: 'italic' }),
  underline: style({ textDecoration: 'underline' }),
  strikeThrough: style({ textDecoration: 'line-through' }),
  underlineStrikeThrough: style({ textDecoration: 'underline line-through' }),
  link: style([link({ variant: 'document' })]),
  paragraph: style([paragraph({ variant: 'paragraph2' })]),
  quote: style([blockquote({ variant: 'regular', context: 'component' })]),
  table: style([table()]),
  tableCell: style([
    td(),
    neutralBorder({ variant: 'low', borderWidth: 'thin' }),
    style({ fontWeight: 'inherit' })
  ]),
  tableHeader: style([th()]),
  tableRow: style([
    tr(),
    neutralBorder({ variant: 'low', borderWidth: 'thin' }),
    style({
      selectors: {
        '&:first-of-type': { fontWeight: vars.fontWeight.bold }
      }
    })
  ])
};
