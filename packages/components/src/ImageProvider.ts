'use client';
import { createContext, Context, ElementType, useContext } from 'react';

export type ImageProviderValue = ElementType;

const ImageContext: Context<ImageProviderValue> = createContext<ImageProviderValue>('img');

export const useImageComponent = (): ElementType => useContext(ImageContext);

export const ImageProvider = ImageContext.Provider;
