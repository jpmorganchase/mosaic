import { createContext, Context, useContext } from 'react';
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
  const base = new URL('https://mosaic.invalid');
  base.pathname = baseRoute;
  const url = new URL(href, base);
  return `${url.pathname}${url.search}${url.hash}`;
}

export const useBaseRoute = () => useContext(BaseUrlContext);

export const useResolveRelativeUrl = href => {
  const baseRoute = useContext(BaseUrlContext);

  return resolveRelativeUrl(href, baseRoute);
};
