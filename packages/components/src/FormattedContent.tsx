import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';

import { getMarkdownElements } from './Markdown/markdownElements';

type SupportedComponents = Pick<
  Components,
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'em' | 'strong' | 'ul' | 'ol' | 'li'
> & {
  listItem: SupportedComponents['li'];
  emphasis: SupportedComponents['em'];
};

type FormattedContentProps = {
  className?: string;
  children: string;
  components?: SupportedComponents;
};

const {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  h6: H6,
  ol: Ol,
  ul: Ul,
  li: ListItem,
  em: Emphasis,
  p: P,
  strong: Strong
} = getMarkdownElements();

const renderers: SupportedComponents = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h1: ({ node, ...props }) => <H1 {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h2: ({ node, ...props }) => <H2 {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h3: ({ node, ...props }) => <H3 {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h4: ({ node, ...props }) => <H4 {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h5: ({ node, ...props }) => <H5 {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h6: ({ node, ...props }) => <H6 {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  p: ({ node, children, ...props }) => <P {...props}>{children}</P>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  emphasis: ({ node, children, ...props }) => <Emphasis {...props}>{children}</Emphasis>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  strong: ({ node, children, ...props }) => <Strong {...props}>{children}</Strong>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ul: ({ node, children, ...props }) => <Ul {...props}>{children}</Ul>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ol: ({ node, children, ...props }) => <Ol {...props}>{children}</Ol>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  listItem: ({ node, children, ...props }) => <ListItem {...props}>{children}</ListItem>
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
