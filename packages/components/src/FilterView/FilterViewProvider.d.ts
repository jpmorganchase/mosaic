import * as React from 'react';
export interface State {
  /** Number of visible items */
  displayedCount: number;
  /** Number of items in the data view */
  totalItemCount: number;
}
export declare const FilterViewContext: React.Context<State>;
export declare function FilterViewProvider({
  children,
  state
}: {
  children: React.ReactElement;
  state: State;
}): React.ReactElement;
