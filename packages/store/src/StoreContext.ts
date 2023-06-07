import { createContext } from 'react';
import { type StoreApi } from 'zustand';
import { SiteState } from './store';

export const StoreContext = createContext<StoreApi<SiteState> | null>(null);
