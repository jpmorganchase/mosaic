import { createContext } from 'react';
import { type StoreApi } from 'zustand';
import { StoreState } from './store';

export const StoreContext = createContext<StoreApi<StoreState> | null>(null);
StoreContext.displayName = 'StoreContext';
