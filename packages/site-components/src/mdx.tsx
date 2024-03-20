import React from 'react';
import { Pre, getMarkdownComponents, withMarkdownSpacing } from '@jpmorganchase/mosaic-components';
import type { PreProps } from '@jpmorganchase/mosaic-components';
import { getLabMarkdownComponents } from '@jpmorganchase/mosaic-labs-components';
import { OpenAPI } from '@jpmorganchase/mosaic-open-api-component';
import type { OpenAPIProps } from '@jpmorganchase/mosaic-open-api-component';

import { Home } from './Home';
import { Image } from './Image';
import type { ImageProps } from './Image';

const components = {
  ...getMarkdownComponents(),
  Labs: getLabMarkdownComponents(),
  Home,
  img: withMarkdownSpacing<ImageProps>(Image),
  pre: withMarkdownSpacing<PreProps>(props => <Pre {...props} CodeBlockProps={{ components }} />),
  OpenAPI: withMarkdownSpacing<OpenAPIProps>(OpenAPI)
};

export default components;
