import * as React from 'react';

export interface State {
  /** Number of visible items */
  displayedCount: number;
  /** Number of items in the data view */
  totalItemCount: number;
}

export const FilterViewContext: React.Context<State> = React.createContext<State>({
  displayedCount: 0,
  totalItemCount: 0
});

export function FilterViewProvider({
  children,
  state
}: {
  children: React.ReactElement;
  state: State;
}): React.ReactElement {
  return <FilterViewContext.Provider value={state}>{children}</FilterViewContext.Provider>;
}
