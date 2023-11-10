import * as React from 'react';
declare type Action =
  | {
      type: 'addFilter';
      value: string;
    }
  | {
      type: 'removeFilter';
      value: string;
    }
  | {
      type: 'setFilters';
      value: string[];
    }
  | {
      type: 'setSort';
      value: string;
    };
declare type Dispatch = (action: Action) => void | undefined;
export declare type State = {
  filters?: string[];
  sort?: string;
  hasStateChanged?: boolean;
};
export declare type OnStateChangeCallback = (state: State | undefined) => void;
export interface ToolbarProviderProps {
  /** Children of the Toolbar */
  children: React.ReactNode;
  /** Initial filter/sort state of the view */
  initialState?: State;
  /** Callback called when the filter/sort state changes */
  onStateChange?: OnStateChangeCallback;
}
declare const ToolbarProvider: ({
  children,
  initialState,
  onStateChange
}: ToolbarProviderProps) => JSX.Element;
declare function useToolbarState(): State;
declare function useToolbarDispatch(): Dispatch;
export { ToolbarProvider, useToolbarState, useToolbarDispatch };
