import React from 'react';
import { useRouter } from 'next/router';

/**
 * Returns an array with a boolean for `isLoading` and a boolean for `isBaseRouteChanging`
 */
export function useIsLoading({ loadingDelay }: { loadingDelay?: number } = {}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState<[boolean, boolean]>([!router.isReady, false]);
  const isLoadingRef = React.useRef(isLoading[0]);
  const lastBaseRootRef = React.useRef(router.asPath.split('/')[1]);
  const deferredStateTimerIdRef = React.useRef<NodeJS.Timeout | null>();

  const clearDeferredStateTimer = React.useCallback(() => {
    if (deferredStateTimerIdRef.current) {
      clearTimeout(deferredStateTimerIdRef.current);
      deferredStateTimerIdRef.current = null;
    }
  }, []);

  const handleRouteChangeStart = React.useCallback(
    newRoute => {
      const newBaseRoute = newRoute.split('/')[1];
      const isBaseRouteChanging = newBaseRoute !== lastBaseRootRef.current;

      isLoadingRef.current = true;

      clearDeferredStateTimer();

      if (loadingDelay) {
        deferredStateTimerIdRef.current = setTimeout(() => {
          if (isLoadingRef.current) {
            setIsLoading([true, isBaseRouteChanging]);
          }
        }, loadingDelay);
      } else {
        setIsLoading([true, isBaseRouteChanging]);
      }
    },
    [loadingDelay, clearDeferredStateTimer]
  );
  const handleRouteChangeError = React.useCallback(() => {
    clearDeferredStateTimer();
    if (isLoadingRef.current) {
      setIsLoading([false, false]);
    }
    isLoadingRef.current = false;
  }, [clearDeferredStateTimer]);
  const handleRouteChangeComplete = React.useCallback(
    newRoute => {
      clearDeferredStateTimer();
      if (isLoadingRef.current) {
        setIsLoading([false, false]);
      }
      isLoadingRef.current = false;
      lastBaseRootRef.current = newRoute.split('/')[1];
    },
    [clearDeferredStateTimer]
  );

  React.useEffect(() => {
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeError', handleRouteChangeError);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeError', handleRouteChangeError);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isLoading;
}
