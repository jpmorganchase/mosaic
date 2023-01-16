import React from 'react';
import { useRouter } from 'next/router';

/**
 * Returns an array with a boolean for `isLoading` and a boolean for `isBaseRouteChanging`
 */
export function useIsLoading() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const lastBaseRootRef = React.useRef(router.asPath);

  const handleRouteChangeStart = React.useCallback(newRoute => {
    const newBaseRoute = newRoute.replace(/\.[^/.]+$/, '');
    const isBaseRouteChanging = newBaseRoute !== lastBaseRootRef.current;

    if (!isBaseRouteChanging) {
      return;
    }

    setIsLoading(true);
  }, []);
  const handleRouteChangeError = React.useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleRouteChangeComplete = React.useCallback(newRoute => {
    lastBaseRootRef.current = newRoute.replace(/\.[^/.]+$/, '');
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeError', handleRouteChangeError);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeError', handleRouteChangeError);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, []);

  return isLoading;
}
