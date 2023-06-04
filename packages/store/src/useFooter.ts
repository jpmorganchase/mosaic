import { useStore } from './store';
import type { FooterSlice } from './types';

type Footer = FooterSlice | undefined;

export function useFooter(): Footer {
  const footer = useStore.getState().sharedConfig?.footer;

  return footer;
}
