import { ElementType } from 'react';
import { useStore } from './store';

export function useLinkComponent(): ElementType {
  const component = useStore(state => state.LinkComponent);
  return component;
}
