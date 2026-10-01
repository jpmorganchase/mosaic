'use client';

/**
 * Persistent frame for a namespace (`/mosaic/...`).
 *
 * Rendered by `app/[namespace]/layout.tsx`, which Next.js keeps mounted
 * while the reader navigates within the namespace. Only the page below
 * it re-renders, so the header (and its search box, menus and session
 * controls) is no longer rebuilt on every navigation, and the search
 * index is sent once per namespace instead of with every page.
 *
 * Layouts from `@jpmorganchase/mosaic-layouts` still render the rest of
 * the chrome; `<FrameProvider value={{ header: true }}>` tells their
 * `LayoutBase` to leave the header out.
 *
 * The frame has its own store, seeded with namespace data. A layout
 * can't see the page it wraps, so each page hands over what only it
 * knows — its shared config (per-folder header overrides, writability)
 * and whether it is in edit mode — with `<FrameSync>` after it mounts.
 * The header's editor controls depend on the session, which is only
 * known in the browser, so nothing visible changes for readers.
 */
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode
} from 'react';
import { ImageProvider, LinkProvider } from '@jpmorganchase/mosaic-components';
import { FrameProvider, LayoutHeader } from '@jpmorganchase/mosaic-layouts';
import { EditModeProvider } from '@jpmorganchase/mosaic-content-editor-plugin/useEditMode';
import { AppHeader } from '@jpmorganchase/mosaic-site-components/AppHeader/index';
import { BaseUrlProvider } from '@jpmorganchase/mosaic-site-components/BaseUrlProvider';
import { Image } from '@jpmorganchase/mosaic-site-components/Image/index';
import { Link } from '@jpmorganchase/mosaic-site-components/Link';
import {
  disposeStore,
  initializeStore,
  registerStore,
  StoreProvider,
  type SiteState
} from '@jpmorganchase/mosaic-store';

type SharedConfig = SiteState['sharedConfig'] | undefined;

export interface NamespaceFrameData {
  sharedConfig?: SharedConfig;
  searchIndex?: unknown;
  searchConfig?: unknown;
}

const FRAME_RENDERS_HEADER = { header: true };

type FrameHandle = {
  store: ReturnType<typeof initializeStore>;
  namespaceSharedConfig: MutableRefObject<SharedConfig>;
  setIsEditing: (isEditing: boolean) => void;
};

const FrameContext = createContext<FrameHandle | undefined>(undefined);
FrameContext.displayName = 'NamespaceFrameContext';

export function NamespaceFrame({
  data,
  children
}: {
  data: NamespaceFrameData;
  children: ReactNode;
}) {
  const [store] = useState(() => initializeStore(data as Partial<SiteState>));
  const [isEditing, setIsEditing] = useState(false);
  const namespaceSharedConfig = useRef<SharedConfig>(data.sharedConfig);
  const seededWith = useRef(data);

  // `router.refresh()` re-renders this layout with fresh data. Refresh
  // the search data here; the shared config is re-sent by the page's
  // `<FrameSync>`, which runs before this effect and must not be undone.
  useLayoutEffect(() => {
    namespaceSharedConfig.current = data.sharedConfig;
    if (seededWith.current === data) return;
    seededWith.current = data;
    store.setState({
      searchIndex: data.searchIndex,
      searchConfig: data.searchConfig
    } as Partial<SiteState>);
  }, [store, data]);

  // Colour-mode sync with the other stores while mounted.
  useEffect(() => {
    registerStore(store);
    return () => disposeStore(store);
  }, [store]);

  const handle = useMemo(() => ({ store, namespaceSharedConfig, setIsEditing }), [store]);

  return (
    <FrameContext.Provider value={handle}>
      <StoreProvider value={store}>
        <BaseUrlProvider>
          <ImageProvider value={Image}>
            <LinkProvider value={Link}>
              <LayoutHeader>
                <EditModeProvider isEditing={isEditing}>
                  <AppHeader />
                </EditModeProvider>
              </LayoutHeader>
            </LinkProvider>
          </ImageProvider>
        </BaseUrlProvider>
      </StoreProvider>
      <FrameProvider value={FRAME_RENDERS_HEADER}>{children}</FrameProvider>
    </FrameContext.Provider>
  );
}

/**
 * Hands the current page's shared config and edit state to the frame's
 * header. Without `sharedConfig` (404 pages) the namespace's own config
 * is restored. Renders nothing; a no-op outside a `<NamespaceFrame>`.
 */
export function FrameSync({
  sharedConfig,
  isEditing = false
}: {
  sharedConfig?: SharedConfig;
  isEditing?: boolean;
}) {
  const frame = useContext(FrameContext);
  useLayoutEffect(() => {
    if (!frame) return;
    frame.store.setState({
      sharedConfig: sharedConfig ?? frame.namespaceSharedConfig.current ?? {}
    } as Partial<SiteState>);
  }, [frame, sharedConfig]);
  useLayoutEffect(() => {
    frame?.setIsEditing(isEditing);
  }, [frame, isEditing]);
  return null;
}
