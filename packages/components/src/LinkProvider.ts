'use client';
import { createContext, Context, ElementType, useContext } from 'react';

export type LinkProviderValue = ElementType;

const LinkContext: Context<LinkProviderValue> = createContext<LinkProviderValue>('a');

export const useLinkComponent = (): ElementType => useContext(LinkContext);

export const LinkProvider = LinkContext.Provider;
