import { useStore } from './store';
import type { RouteSlice } from './types';

export function useRoute(): RouteSlice {
  const route = useStore(state => state.route);
  return {
    route
  };
}
