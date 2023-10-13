import { useStore } from './store';

export const useStoreActions = () => useStore(state => state.actions);
