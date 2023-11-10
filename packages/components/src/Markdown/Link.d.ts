import React from 'react';
import { LinkProps } from '../Link';
export interface MarkdownLinkProps extends LinkProps {
  href?: string;
}
export declare const Link: React.FC<React.PropsWithChildren<MarkdownLinkProps>>;
