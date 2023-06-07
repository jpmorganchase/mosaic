import { ElementType } from 'react';
import { useStore } from './useStore';

export function useImageComponent(): ElementType {
  const component = useStore(state => state.ImageComponent);
  return component;
}
