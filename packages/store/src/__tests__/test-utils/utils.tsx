import React from 'react';
import { render } from '@testing-library/react';

import { useCreateStore, StoreProvider, type SiteState } from '../../store';

export function renderWithStore(ui: React.ReactElement) {
  const { rerender, ...result } = render(<Store>{ui}</Store>);
  return {
    ...result,
    rerender: (rerenderUi: React.ReactElement) => rerender(<Store>{rerenderUi}</Store>)
  };
}

export function createWrapper(state?: Partial<SiteState>) {
  return ({ children }: { children?: React.ReactNode }) => <Store state={state}>{children}</Store>;
}

/**
 *
 * @param state: initial state for the site store
 */
const Store: React.FC<{ state?: Partial<SiteState> }> = ({ children, state = {} }) => {
  const createStore = useCreateStore(state);
  return <StoreProvider value={createStore()}>{children}</StoreProvider>;
};
