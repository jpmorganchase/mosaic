import React, { useEffect } from 'react';
import warning from 'warning';
import { Pre, getMarkdownComponents, withMarkdownSpacing } from '@dpmosaic/components';
import type { PreProps } from '@dpmosaic/components';
import { getLabMarkdownComponents } from '@dpmosaic/components/dist-labs/index';
import { OpenAPI } from '@dpmosaic/components-open-api';
import type { OpenAPIProps } from '@dpmosaic/components-open-api';

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
