/// <reference types="react" />
export declare const getMarkdownElements: () => {
  a: import('react').FC<import('react').PropsWithChildren<import('./Link').MarkdownLinkProps>>;
  blockquote: import('react').FC<
    import('react').PropsWithChildren<import('./BlockQuote').BlockQuoteProps>
  >;
  code: import('react').FC<
    import('react').PropsWithChildren<import('./InlineCode').InlineCodeProps>
  >;
  ol: import('react').FC<import('react').PropsWithChildren<import('../List').OrderedListProps>>;
  ul: import('react').FC<import('react').PropsWithChildren<import('../List').UnOrderedListProps>>;
  li: import('react').FC<import('react').PropsWithChildren<import('../List').ListItemProps>>;
  hr: import('react').FC<
    import('react').PropsWithChildren<import('./ThematicBreak').ThematicBreakProps>
  >;
  h1: (props: any) => JSX.Element;
  h2: (props: any) => JSX.Element;
  h3: (props: any) => JSX.Element;
  h4: (props: any) => JSX.Element;
  h5: (props: any) => JSX.Element;
  h6: (props: any) => JSX.Element;
  p: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  pre: import('react').FC<import('react').PropsWithChildren<import('./Pre').PreProps>>;
  Pre: import('react').FC<import('react').PropsWithChildren<import('./Pre').PreProps>>;
  inlineCode: import('react').FC<
    import('react').PropsWithChildren<import('./InlineCode').InlineCodeProps>
  >;
  table: import('react').FC<import('react').PropsWithChildren<import('./Table').TableProps>>;
  Table: import('react').FC<import('react').PropsWithChildren<import('./Table').TableProps>>;
  tbody: import('react').FC<import('react').PropsWithChildren<import('./Tbody').TbodyProps>>;
  Tbody: import('react').FC<import('react').PropsWithChildren<import('./Tbody').TbodyProps>>;
  thead: import('react').FC<import('react').PropsWithChildren<import('./Thead').TheadProps>>;
  Thead: import('react').FC<import('react').PropsWithChildren<import('./Thead').TheadProps>>;
  th: import('react').FC<import('react').PropsWithChildren<import('./Th').ThProps>>;
  Th: import('react').FC<import('react').PropsWithChildren<import('./Th').ThProps>>;
  td: import('react').FC<import('react').PropsWithChildren<import('./Td').TdProps>>;
  Td: import('react').FC<import('react').PropsWithChildren<import('./Td').TdProps>>;
  tr: import('react').FC<import('react').PropsWithChildren<import('./Tr').TrProps>>;
  Tr: import('react').FC<import('react').PropsWithChildren<import('./Tr').TrProps>>;
  em: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  strong: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
};
