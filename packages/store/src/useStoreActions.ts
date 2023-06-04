import { useStore } from './store';
export const useStoreActions = () => useStore.getState().actions;
