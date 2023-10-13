import type { ElementType } from 'react';

import { useStoreActions } from '@jpmorganchase/mosaic-store';
import { Link } from './Link';

interface LinkProviderProps {
  LinkComponent?: ElementType;
}

export function LinkProvider({ LinkComponent = Link }: LinkProviderProps) {
  const actions = useStoreActions();
  actions.setLinkComponent(LinkComponent);
  return null;
}
