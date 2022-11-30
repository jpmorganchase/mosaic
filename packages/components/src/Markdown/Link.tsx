import React from 'react';

import { Link as LinkComponent, LinkProps } from '../Link';

export interface MarkdownLinkProps extends LinkProps {
  href?: string;
}

export const Link: React.FC<MarkdownLinkProps> = ({ href, ...rest }) => (
  <LinkComponent link={href} variant="document" {...rest} />
);
