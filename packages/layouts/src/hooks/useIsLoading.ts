import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import debounce from 'lodash/debounce';

// Unexported type from next/dist/shared/lib/mitt.d.ts
declare type Handler = (...evts: any[]) => void;

export function useIsLoading({ loadingDelay }: { loadingDelay?: number } = {}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const start = debounce(() => {
      setIsLoading(true);
    }, loadingDelay);

    const handleRouteChangeStart: Handler = (_url, { shallow }) => {
      if (!shallow) {
        start();
      }
    };

    const handleRouteChangeDone: Handler = (_url, { shallow }) => {
      if (!shallow) {
        setIsLoading(false);
      }
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeError', handleRouteChangeDone);
    router.events.on('routeChangeComplete', handleRouteChangeDone);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeError', handleRouteChangeDone);
      router.events.off('routeChangeComplete', handleRouteChangeDone);
    };
  }, [router]);

  return isLoading;
}
