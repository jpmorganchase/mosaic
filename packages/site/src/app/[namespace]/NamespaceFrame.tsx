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
 * knows — its canonical route, shared config (per-folder header
 * overrides, writability) and edit mode — with `<FrameSync>` after it mounts.
 * The first server render uses the layout's fallback config and its
 * matching document route. The page's route/config pair takes over
 * before the first client paint, including when an alias is visited.
 */
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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
  /** Base route for the frame's fallback config, including the index page. */
  route: string;
  sharedConfig?: SharedConfig;
  searchIndex?: unknown;
  searchConfig?: unknown;
}

const FRAME_RENDERS_HEADER = { header: true };

type FrameHandle = {
  store: ReturnType<typeof initializeStore>;
  defaultRoute: string;
  defaultSharedConfig: SharedConfig;
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
  const seededWith = useRef(data);

  // `router.refresh()` re-renders this layout with fresh data. Refresh
  // the search data here; the shared config is re-sent by the page's
  // `<FrameSync>`, which runs before this effect and must not be undone.
  useLayoutEffect(() => {
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
 * Hands the current page's canonical route, shared config and edit state
 * to the frame's header. Relative links and images must use the content
 * route, including `/index`, even when the browser is visiting an alias.
 * Without page data (404 pages) the frame's fallback config and route
 * are restored. Renders nothing; a no-op outside a `<NamespaceFrame>`.
 */
export function FrameSync({
  route,
  sharedConfig,
  isEditing = false
}: {
  route?: string;
  sharedConfig?: SharedConfig;
  isEditing?: boolean;
}) {
  const frame = useContext(FrameContext);
  useLayoutEffect(() => {
    if (!frame) return;
    frame.store.setState({
      route: route ?? frame.defaultRoute,
      sharedConfig: sharedConfig ?? frame.defaultSharedConfig ?? {}
    } as Partial<SiteState>);
  }, [frame, route, sharedConfig]);
  useLayoutEffect(() => {
    frame?.setIsEditing(isEditing);
  }, [frame, isEditing]);
  return null;
}
