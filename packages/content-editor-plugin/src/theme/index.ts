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
  text: {
    bold: styles.bold,
    italic: styles.italic,
    strikethrough: styles.strikeThrough,
    underline: styles.underline,
    underlineStrikethrough: styles.underlineStrikeThrough
  }
};

export default theme;
