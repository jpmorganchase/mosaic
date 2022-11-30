import React from 'react';
import { Hero } from '@dpmosaic/components';

export function Page404() {
  return (
    <Hero
      description="Sorry, looks like something's wrong here."
      image="/img/404.png"
      title="Page Not Found"
      links={[{ url: '/', label: 'Return to Homepage' }]}
    />
  );
}
