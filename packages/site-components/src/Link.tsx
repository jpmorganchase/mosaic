'use client';
import NextLink from 'next/link';
import React, { Ref } from 'react';

import { useResolveRelativeUrl } from './BaseUrlProvider';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

export type LinkType = { link: string; text: string };

export const Link = React.forwardRef(
  ({ href = '', ...props }: LinkProps, ref: Ref<HTMLAnchorElement>) => {
    const url = useResolveRelativeUrl(href);

    return <NextLink as={url} href={url} ref={ref} {...props} />;
  }
);
