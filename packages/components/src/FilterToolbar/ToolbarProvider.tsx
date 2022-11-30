import * as React from 'react';
import { Context } from 'react';

type Action =
  | { type: 'addFilter'; value: string }
  | { type: 'removeFilter'; value: string }
  | { type: 'setFilters'; value: string[] }
  | { type: 'setSort'; value: string };
type Dispatch = (action: Action) => void | undefined;
export type State = { filters?: string[]; sort?: string; hasStateChanged?: boolean };
export type OnStateChangeCallback = (state: State | undefined) => void;

export interface ToolbarProviderProps {
  /** Children of the Toolbar */
  children: React.ReactNode;
  /** Initial filter/sort state of the view */
  initialState?: State;
  /** Callback called when the filter/sort state changes */
  onStateChange?: OnStateChangeCallback;
}

const ToolbarStateContext: Context<State | undefined> = React.createContext<State | undefined>(
  undefined
);
const ToolbarDispatchContext: Context<Dispatch | undefined> = React.createContext<
  Dispatch | undefined
>(undefined);

function toolbarReducer(state: State, action: Action): State {
  const { filters } = state;
  switch (action.type) {
    case 'setFilters': {
      return { ...state, filters: action.value, hasStateChanged: true };
    }
    case 'addFilter': {
      if (filters && filters.indexOf(action.value) === -1) {
        return { ...state, filters: [...filters, action.value], hasStateChanged: true };
      }
      return state;
    }
    case 'removeFilter': {
      const newFilters = filters && filters.filter(value => value !== action.value);
      return { ...state, filters: newFilters, hasStateChanged: true };
    }
    case 'setSort': {
      return { ...state, sort: action.value, hasStateChanged: true };
    }
    default: {
      throw new Error(`Unhandled action type: ${action}`);
    }
  }
}

const ToolbarProvider = ({ children, initialState = {}, onStateChange }: ToolbarProviderProps) => {
  const previousStateRef = React.useRef<State>();
  const nextStateRef = React.useRef<State>();
  const [state, dispatch] = React.useReducer(toolbarReducer, initialState);
  React.useEffect(() => {
    if (
      onStateChange &&
      previousStateRef.current &&
      previousStateRef.current !== nextStateRef.current
    ) {
      onStateChange(nextStateRef.current);
    }
    previousStateRef.current = nextStateRef.current;
  });
  if (state) {
    nextStateRef.current = state;
  }
  return (
    <ToolbarStateContext.Provider value={state}>
      <ToolbarDispatchContext.Provider value={dispatch}>{children}</ToolbarDispatchContext.Provider>
    </ToolbarStateContext.Provider>
  );
};

function useToolbarState(): State {
  const context = React.useContext(ToolbarStateContext);
  if (context === undefined) {
    throw new Error('useToolbarState must be used within a ToolbarProvider');
  }
  return context;
}

function useToolbarDispatch(): Dispatch {
  const context = React.useContext(ToolbarDispatchContext);
  if (context === undefined) {
    throw new Error('useToolbarDispatch must be used within a ToolbarProvider');
  }
  return context;
}

export { ToolbarProvider, useToolbarState, useToolbarDispatch };
