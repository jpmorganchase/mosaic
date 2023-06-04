import { useStore } from './store';

export function useSource() {
  const source = useStore.getState().source;
  return source;
}
