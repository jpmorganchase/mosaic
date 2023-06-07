import { ElementType } from 'react';
import { useStore } from './useStore';

export function useLinkComponent(): ElementType {
  const component = useStore(state => state.LinkComponent);
  return component;
}
