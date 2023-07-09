import React from 'react';
import { Hero, HeroProps } from '@jpmorganchase/mosaic-components';

export const Page500: React.FC<HeroProps> = ({
  children,
  description = 'A 500 error occurred.',
  title = 'Whoops! something went wrong',
  ...rest
}) => (
  <Hero description={description} image="/img/500.png" title={title} {...rest}>
    {children}
  </Hero>
);
