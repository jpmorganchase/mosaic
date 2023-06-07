import React from 'react';
import { Hero, HeroProps } from '@jpmorganchase/mosaic-components';

export const Page404: React.FC<HeroProps> = ({
  children,
  description = "Sorry, looks like something's wrong here.",
  title = 'Page Not Found',
  ...rest
}) => <Hero description={description} image="/img/404.png" title={title} {...rest} />;
