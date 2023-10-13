import type { ElementType } from 'react';
import { useStoreActions } from '@jpmorganchase/mosaic-store';

import { Image } from './Image';

interface ImageProviderProps {
  ImageComponent?: ElementType;
}

export function ImageProvider({ ImageComponent = Image }: ImageProviderProps) {
  const actions = useStoreActions();
  actions.setImageComponent(ImageComponent);
  return null;
}
