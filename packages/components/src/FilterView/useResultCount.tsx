import { useContext } from 'react';

import { FilterViewContext, State } from './FilterViewProvider';

export function useFilterViewState(): State {
  const state = useContext(FilterViewContext);
  return state;
}
