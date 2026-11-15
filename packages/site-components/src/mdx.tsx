import { getMarkdownComponents, withMarkdownSpacing } from '@jpmorganchase/mosaic-components';

import { Home } from './Home';
import { Image } from './Image';
import type { ImageProps } from './Image';

// Keep the registry declaration in terms of public component types. Inlining
// every inferred prop can otherwise name a workspace's nested node_modules.
const components: ReturnType<typeof getMarkdownComponents> & {
  Home: typeof Home;
  img: ReturnType<typeof withMarkdownSpacing<ImageProps>>;
} = {
  ...getMarkdownComponents(),
  Home,
  img: withMarkdownSpacing<ImageProps>(Image)
};

export default components;
