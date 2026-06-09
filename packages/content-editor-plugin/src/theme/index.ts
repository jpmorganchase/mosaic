import type { EditorThemeClasses } from 'lexical';

import styles from './index.css';

const theme: EditorThemeClasses = {
  paragraph: styles.paragraph,
  quote: styles.quote,
  link: styles.link,
  table: styles.table,
  tableCell: styles.tableCell,
  tableCellHeader: styles.tableHeader,
  tableRow: styles.tableRow,
  // Multi-cell drag selection styling. `tableSelection` disables
  // native text selection on the table (without which Lexical's
  // TableObserver mousedown handler can't take over and drag-to-
  // select silently no-ops); `tableCellSelected` paints each
  // selected cell with a translucent overlay so the user can see
  // what they've highlighted.
  tableSelection: styles.tableSelection,
  tableCellSelected: styles.tableCellSelected,
  text: {
    bold: styles.bold,
    italic: styles.italic,
    strikethrough: styles.strikeThrough,
    underline: styles.underline,
    underlineStrikethrough: styles.underlineStrikeThrough
  }
};

export default theme;
