import React from 'react';
import { Hero } from '@dpmosaic/components';

export function Page500() {
  return (
    <Hero
      description="A 500 error occurred."
      image="/img/500.png"
      links={[{ url: '/', label: 'Return to Homepage' }]}
      title="Whoops! something went wrong"
    />
  );
}
