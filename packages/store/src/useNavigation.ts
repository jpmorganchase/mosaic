import { useStore } from './store';
import type { Navigation } from './types';

export function useNavigation(): Navigation {
  const { next, prev } = useStore.getState().navigation || {};
  return {
    next,
    prev
  };
}
