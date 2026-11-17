'use client';

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';

import { initializeStore, StoreProvider, type SiteState } from './store';

export type FrameValue = { header: boolean };
const FrameContext = createContext<FrameValue>({ header: false });
FrameContext.displayName = 'FrameContext';

/** Tell page layouts which chrome an enclosing frame already renders. */
export function FrameProvider({ value, children }: { value: FrameValue; children?: ReactNode }) {
  return <FrameContext.Provider value={value}>{children}</FrameContext.Provider>;
}

export function useFrame(): FrameValue {
  return useContext(FrameContext);
}

export interface NamespaceFrameData {
  /** Canonical document route paired with the fallback configuration. */
  route: string;
  sharedConfig?: SiteState['sharedConfig'];
}

type FrameHandle = {
  store: ReturnType<typeof initializeStore>;
  defaultRoute: string;
  defaultSharedConfig: SiteState['sharedConfig'] | undefined;
  setIsEditing: (isEditing: boolean) => void;
};
const PersistentFrameContext = createContext<FrameHandle | undefined>(undefined);
PersistentFrameContext.displayName = 'PersistentFrameContext';
const FRAME_RENDERS_HEADER = { header: true };

/**
 * Persistent header state, independent of the page store. Fallback data seeds
 * the first render; FrameSync owns page overrides and restoring the fallback.
 */
export function PersistentFrame({
  data,
  renderHeader,
  children
}: {
  data: NamespaceFrameData;
  renderHeader: (state: { isEditing: boolean }) => ReactNode;
  children: ReactNode;
}) {
  const [store] = useState(() => initializeStore(data));
  const [isEditing, setIsEditing] = useState(false);
  const handle = useMemo(
    () => ({
      store,
      defaultRoute: data.route,
      defaultSharedConfig: data.sharedConfig,
      setIsEditing
    }),
    [store, data.route, data.sharedConfig]
  );
  return (
    <PersistentFrameContext.Provider value={handle}>
      <StoreProvider value={store}>{renderHeader({ isEditing })}</StoreProvider>
      <FrameProvider value={FRAME_RENDERS_HEADER}>{children}</FrameProvider>
    </PersistentFrameContext.Provider>
  );
}

/** Sync the canonical page route/config before paint. A no-op outside a frame. */
export function FrameSync({
  route,
  sharedConfig,
  isEditing = false
}: {
  route?: string;
  sharedConfig?: SiteState['sharedConfig'];
  isEditing?: boolean;
}) {
  const frame = useContext(PersistentFrameContext);
  useLayoutEffect(() => {
    if (!frame) return;
    frame.store.setState({
      route: route ?? frame.defaultRoute,
      sharedConfig: sharedConfig ?? frame.defaultSharedConfig ?? {}
    });
  }, [frame, route, sharedConfig]);
  useLayoutEffect(() => {
    frame?.setIsEditing(isEditing);
  }, [frame, isEditing]);
  return null;
}
