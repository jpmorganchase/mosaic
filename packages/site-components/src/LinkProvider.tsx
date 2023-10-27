import { ElementType, useEffect } from 'react';
import { useStoreActions } from '@jpmorganchase/mosaic-store';

import { Link } from './Link';

interface LinkProviderProps {
  LinkComponent?: ElementType;
}

export function LinkProvider({ LinkComponent = Link }: LinkProviderProps) {
  const actions = useStoreActions();
  useEffect(() => {
    actions.setLinkComponent(LinkComponent);
  }, [LinkComponent]);

  return null;
}
