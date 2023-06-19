import { emphasis, link, paragraph } from '@jpmorganchase/mosaic-theme';
import {
  ListItem,
  OrderedList,
  UnorderedList,
  withStyledTypography
} from '@jpmorganchase/mosaic-components';
import { Image as MosaicImage, ImageProps } from '@jpmorganchase/mosaic-site-components';

import { BlockQuote } from './BlockQuote';
import { InlineCode } from './InlineCode';
import * as Heading from './Heading';
import { Link } from './Link';
import { Pre as MosaicPre } from './Pre';
import { Table as MosaicTable } from './Table';
import { Tbody as MosaicTbody } from './Tbody';
import { Thead as MosaicThead } from './Thead';
import { Th as MosaicTh } from './Th';
import { Td as MosaicTd } from './Td';
import { Tr as MosaicTr } from './Tr';
import { ThematicBreak } from './ThematicBreak';
import { withMarkdownSpacing } from './withMarkdownSpacing';

export const a = withMarkdownSpacing(Link, link({ context: 'markdown', variant: 'document' }));
export const blockquote = withMarkdownSpacing(BlockQuote);
export const ol = withMarkdownSpacing(OrderedList);
export const ul = withMarkdownSpacing(UnorderedList);
export const li = withMarkdownSpacing(ListItem, 'none');
export const hr = ThematicBreak;
export const h1 = Heading.H1;
export const h2 = Heading.H2;
export const h3 = Heading.H3;
export const h4 = Heading.H4;
export const h5 = Heading.H5;
export const h6 = Heading.H6;
export const img = withMarkdownSpacing<ImageProps>(MosaicImage);
export const Image = img;
export const p = withStyledTypography(paragraph({ variant: 'paragraph2', context: 'markdown' }));
export const pre = withMarkdownSpacing(MosaicPre);
export const Pre = withMarkdownSpacing(MosaicPre);
export const inlineCode = withMarkdownSpacing(InlineCode, 'none');
export const table = withMarkdownSpacing(MosaicTable);
export const Table = table;
export const tbody = withMarkdownSpacing(MosaicTbody, 'none');
export const Tbody = tbody;
export const thead = withMarkdownSpacing(MosaicThead, 'none');
export const Thead = thead;
export const th = withMarkdownSpacing(MosaicTh, 'none');
export const Th = th;
export const td = withMarkdownSpacing(MosaicTd, 'none');
export const Td = MosaicTd;
export const tr = withMarkdownSpacing(MosaicTr, 'none');
export const Tr = tr;
export const em = withStyledTypography(
  emphasis({ variant: 'regular', context: 'markdown' }),
  'span'
);
export const strong = withStyledTypography(
  emphasis({ variant: 'strong', context: 'markdown' }),
  'span'
);
