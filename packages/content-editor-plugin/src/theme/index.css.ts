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
  /**
   * `tableSelection` is applied to the `<table>` while the user has
   * a multi-cell drag selection active. Disabling the native text
   * selection here is mandatory — without it the browser's caret
   * selection takes priority over Lexical's TableObserver mousedown
   * handling and drag-to-select cells silently does nothing.
   * Mirrors upstream `@lexical/react`'s playground theme
   * (`PlaygroundEditorTheme.css` → `.PlaygroundEditorTheme__tableSelection`).
   */
  tableSelection: style({
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    userSelect: 'none'
  }),
  /**
   * `tableCellSelected` is applied to each `<td>` inside a multi-
   * cell selection. The translucent overlay is rendered via
   * `caret-color: transparent` (to hide the per-cell caret) plus
   * a `::after` tint matching upstream's playground styling, so
   * the highlight reads as a single contiguous block across
   * borders.
   */
  tableCellSelected: style({
    caretColor: 'transparent',
    position: 'relative',
    selectors: {
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgb(172 206 247 / 30%)',
        pointerEvents: 'none'
      }
    }
  }),
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
