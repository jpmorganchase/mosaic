import { getMarkdownComponents, withMarkdownSpacing } from '@jpmorganchase/mosaic-components';
import { OpenAPI } from '@jpmorganchase/mosaic-open-api-component';
import type { OpenAPIProps } from '@jpmorganchase/mosaic-open-api-component';

import { Home } from './Home';
import { Image } from './Image';
import type { ImageProps } from './Image';

const components = {
  ...getMarkdownComponents(),
  Home,
  img: withMarkdownSpacing<ImageProps>(Image),
  OpenAPI: withMarkdownSpacing<OpenAPIProps>(OpenAPI)
};

export default components;
