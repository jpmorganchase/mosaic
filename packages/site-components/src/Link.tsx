import NextLink from 'next/link';
import React, { Ref } from 'react';
import { hasProtocol } from '@jpmorganchase/mosaic-components';

function resolveRelativeUrl(href: string, baseRoute: string) {
  if (hasProtocol(href) || href.startsWith('#') || !href.startsWith('.')) {
    return href;
  }
  if (!baseRoute) {
    throw new Error('Cannot resolve relative url as base route is undefined');
  }
  const url = new URL('http://jpmorgan.com');
  const anchorMatches = href.match(/(.*)#(.*)/);
  if (anchorMatches && anchorMatches[2]) {
    // Anchors will get encoded to %23 if set on URL
    url.pathname = `${baseRoute}/../${anchorMatches[1]}`;
    return `${url.pathname}#${anchorMatches[2]}`;
  }
  url.pathname = `${baseRoute}/../${href}`;
  return url.pathname;
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

export type LinkType = { link: string; text: string };

export const Link = React.forwardRef(
  ({ href = '', ...props }: LinkProps, ref: Ref<HTMLAnchorElement>) => {
    const url = resolveRelativeUrl(href, '/');

    return <NextLink as={url} href={url} ref={ref} {...props} />;
  }
);
