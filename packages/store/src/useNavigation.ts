import { useStore } from './store';
import type { Navigation } from './types';

export function useNavigation(): Navigation {
  const { next, prev } = useStore(state => state.navigation) || {};
  return {
    next,
    prev
  };
}
