import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';

import { getMarkdownElements } from './Markdown/markdownElements';
import * as Heading from './Markdown/Heading';
import { Heading1 } from './Markdown/h1';
import { Heading2 } from './Markdown/h2';
import { Heading3 } from './Markdown/h3';
import { Heading4 } from './Markdown/h4';

// Renderers we provide by default + accept overrides for. Aligned
// with `react-markdown` v9's `Components` map (no `listItem` /
// `emphasis` aliases — those map to the standard `li` / `em` slots).
type SupportedComponents = Pick<
  Components,
  'a' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'em' | 'strong' | 'ul' | 'ol' | 'li'
>;

type FormattedContentProps = {
  className?: string;
  children: string;
  components?: SupportedComponents;
};

const { ol: Ol, ul: Ul, li: ListItem, em: Emphasis, p: P, strong: Strong } = getMarkdownElements();

// Headings don't get the page's "Copy link to heading" link: formatted content
// is a fragment (such as a tile description) whose headings have no ids, and
// is often rendered inside a link, where another link is invalid.
const renderers: SupportedComponents = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h1: ({ node, children, ...props }) => <Heading1 {...props}>{children}</Heading1>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h2: ({ node, children, ...props }) => <Heading2 {...props}>{children}</Heading2>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h3: ({ node, children, ...props }) => <Heading3 {...props}>{children}</Heading3>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h4: ({ node, children, ...props }) => <Heading4 {...props}>{children}</Heading4>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h5: ({ node, children, ...props }) => <Heading.H5 {...props}>{children}</Heading.H5>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h6: ({ node, children, ...props }) => <Heading.H6 {...props}>{children}</Heading.H6>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  p: ({ node, children, ...props }) => <P {...props}>{children}</P>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  em: ({ node, children, ...props }) => <Emphasis {...props}>{children}</Emphasis>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  strong: ({ node, children, ...props }) => <Strong {...props}>{children}</Strong>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ul: ({ node, children, ...props }) => <Ul {...props}>{children}</Ul>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ol: ({ node, children, ...props }) => <Ol {...props}>{children}</Ol>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  li: ({ node, children, ...props }) => <ListItem {...props}>{children}</ListItem>
};

export const FormattedContent: React.FC<React.PropsWithChildren<FormattedContentProps>> = ({
  children,
  components = {},
  ...rest
}) => (
  <ReactMarkdown {...rest} components={{ ...renderers, ...components }}>
    {children}
  </ReactMarkdown>
);
