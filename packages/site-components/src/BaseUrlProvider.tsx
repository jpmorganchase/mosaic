'use client';
import React, { createContext, Context, useContext } from 'react';
import { hasProtocol } from '@jpmorganchase/mosaic-components';
import { useRoute } from '@jpmorganchase/mosaic-store';

// The pathname of the current route. We don't get this from router, as we want the full
// path including the /index on index pages.
export type BaseUrlValue = string;

export const BaseUrlContext: Context<BaseUrlValue> = createContext<BaseUrlValue>('/');
export const BaseUrlProvider = ({ children }) => {
  const { route = '/' } = useRoute();
  return <BaseUrlContext.Provider value={route}>{children}</BaseUrlContext.Provider>;
};

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

export const useBaseRoute = () => useContext(BaseUrlContext);

export const useResolveRelativeUrl = href => {
  const baseRoute = useContext(BaseUrlContext);

  return resolveRelativeUrl(href, baseRoute);
};
