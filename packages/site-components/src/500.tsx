import React, { useEffect } from 'react';
import { Hero } from '@jpmorganchase/mosaic-components';
import { useErrorBoundary } from 'react-error-boundary';
import { useRouter } from 'next/router';

export function Page500() {
  const router = useRouter();
  const { resetBoundary } = useErrorBoundary();

  useEffect(() => {
    const handleRouteChange = () => {
      resetBoundary();
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  return (
    <Hero
      description="A 500 error occurred."
      image="/img/500.png"
      links={[{ url: '/', label: 'Return to Homepage' }]}
      title="Whoops! something went wrong"
    />
  );
}
