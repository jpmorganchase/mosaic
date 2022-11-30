import React, { createContext, Context, ElementType, useContext } from 'react';

type ImgProps =
  | {
      alt?: string;
      className?: string;
      height?: string | number;
      layout?: string;
      priority?: boolean;
      src: string;
      objectFit?: string;
      onError?: React.ReactEventHandler<HTMLImageElement>;
      width?: string | number;
    }
  | HTMLImageElement;

export type ImageProviderContext = ElementType<ImgProps>;

const ImageContext: Context<ImageProviderContext> = createContext<ImageProviderContext>('img');

export function useImageComponent<T extends ImgProps>() {
  const ImageComponent = useContext(ImageContext);
  return ImageComponent as React.ComponentType<T>;
}

export const ImageProvider = ImageContext.Provider;
