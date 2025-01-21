import { FC } from 'react';

import type { BrandHeroProps } from '@jpmorganchase/mosaic-components';

import { BrandHero } from '@jpmorganchase/mosaic-components';

export type HeroProps = {
  title: string;
  description?: string;
  image?: string;
  links?: BrandHeroProps['links'];
};

export const Hero: FC<HeroProps> = ({ links = [], title, description, image }) => {
  return <BrandHero title={title} description={description} image={image} links={links} />;
};
