import { emphasis, link, paragraph } from '@jpmorganchase/mosaic-theme';

import { withAnchorHeading } from './AnchorHeading';
import { BlockQuote } from './BlockQuote';
import * as Heading from './Heading';
import { ListItem, OrderedList, UnorderedList } from '../List';
import { Link } from './Link';
import { Pre } from './Pre';
import { Table } from './Table';
import { Tbody } from './Tbody';
import { Thead } from './Thead';
import { Th } from './Th';
import { Td } from './Td';
import { Tr } from './Tr';
import { withStyledTypography } from '../Typography/withStyledTypography';
import { withMarkdownSpacing } from './withMarkdownSpacing';
import { ThematicBreak } from './ThematicBreak';
import { Code } from './code';
import { Heading1 } from './h1';
import { Heading2 } from './h2';
import { Heading3 } from './h3';
import { Heading4 } from './h4';

export const getMarkdownElements = () => ({
  a: withMarkdownSpacing(Link, link({ context: 'markdown', variant: 'document' })),
  blockquote: withMarkdownSpacing(BlockQuote),
  code: withMarkdownSpacing(Code),
  ol: withMarkdownSpacing(OrderedList),
  ul: withMarkdownSpacing(UnorderedList),
  li: withMarkdownSpacing(ListItem, 'none'),
  hr: ThematicBreak,
  h1: withAnchorHeading(Heading1),
  h2: withAnchorHeading(Heading2),
  h3: withAnchorHeading(Heading3),
  h4: withAnchorHeading(Heading4),
  h5: withAnchorHeading(Heading.H5),
  h6: withAnchorHeading(Heading.H6),
  p: withStyledTypography(paragraph({ variant: 'paragraph2', context: 'markdown' })),
  pre: withMarkdownSpacing(Pre),
  Pre: withMarkdownSpacing(Pre),
  inlineCode: withMarkdownSpacing(Code),
  table: withMarkdownSpacing(Table),
  Table: withMarkdownSpacing(Table),
  tbody: withMarkdownSpacing(Tbody, 'none'),
  Tbody: withMarkdownSpacing(Tbody, 'none'),
  thead: withMarkdownSpacing(Thead, 'none'),
  Thead: withMarkdownSpacing(Thead, 'none'),
  th: withMarkdownSpacing(Th, 'none'),
  Th: withMarkdownSpacing(Th, 'none'),
  td: withMarkdownSpacing(Td, 'none'),
  Td: withMarkdownSpacing(Td, 'none'),
  tr: withMarkdownSpacing(Tr, 'none'),
  Tr: withMarkdownSpacing(Tr, 'none'),
  em: withStyledTypography(emphasis({ variant: 'regular', context: 'markdown' }), 'span'),
  strong: withStyledTypography(emphasis({ variant: 'strong', context: 'markdown' }), 'span')
});
