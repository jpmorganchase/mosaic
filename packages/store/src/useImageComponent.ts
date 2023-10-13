import { ElementType } from 'react';
import { useStore } from './store';

export function useImageComponent(): ElementType {
  const component = useStore(state => state.ImageComponent);
  return component;
}
