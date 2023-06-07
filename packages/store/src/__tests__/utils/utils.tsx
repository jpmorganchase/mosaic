import React from 'react';
import { render } from '@testing-library/react';

import { StoreProvider } from '../../StoreProvider';
import type { SiteState } from '../../store';

export function renderWithStore(ui: React.ReactElement) {
  return render(<StoreProvider>{ui}</StoreProvider>);
}

export function createWrapper(state?: Partial<SiteState>) {
  return ({ children }: { children?: React.ReactNode }) => (
    <StoreProvider {...state}>{children}</StoreProvider>
  );
}
