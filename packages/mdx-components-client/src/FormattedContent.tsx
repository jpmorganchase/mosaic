import React, { ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import { ListItem } from '@jpmorganchase/mosaic-components';
import {
  em as Emphasis,
  h1 as H1,
  h2 as H2,
  h3 as H3,
  h4 as H4,
  h5 as H5,
  h6 as H6,
  ol as Ol,
  ul as Ul,
  p as P,
  strong as Strong
} from './markdownElements';

type FormattedContentProps = {
  className?: string;
  children: string;
  components?: {
    h1?: () => ReactElement;
    h2?: () => ReactElement;
    h3?: () => ReactElement;
    h4?: () => ReactElement;
    h5?: () => ReactElement;
    h6?: () => ReactElement;
    p?: () => ReactElement;
    em?: () => ReactElement;
    strong?: () => ReactElement;
    ul?: () => ReactElement;
    ol?: () => ReactElement;
    li?: () => ReactElement;
  };
};

const renderers = {
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
