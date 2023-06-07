import React from 'react';
import { Link as LinkComponent, LinkProps } from '@jpmorganchase/mosaic-components';

export interface MarkdownLinkProps extends LinkProps {
  href?: string;
}

export const Link: React.FC<React.PropsWithChildren<MarkdownLinkProps>> = ({ href, ...rest }) => (
  <LinkComponent link={href} variant="document" {...rest} />
);
