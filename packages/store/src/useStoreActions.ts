import { useColorModeContext } from './ColorModeProvider';

export const useStoreActions = () => useColorModeContext().actions;
