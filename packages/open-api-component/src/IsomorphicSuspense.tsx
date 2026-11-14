import React, { useSyncExternalStore } from 'react';

export interface IsomorphicSuspenseProps {
  fallback: React.JSX.Element;
}

const subscribe = () => () => {};

/**
 * Renders `fallback` on the server and while hydrating, then `children`
 * inside a Suspense boundary, so the first client render matches the
 * server HTML. See `IsomorphicSuspense` in `mosaic-components`.
 */
export const IsomorphicSuspense: React.FC<React.PropsWithChildren<IsomorphicSuspenseProps>> = ({
  children,
  fallback
}) => {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  if (!hydrated) {
    return fallback;
  }
  return <React.Suspense fallback={fallback}>{children}</React.Suspense>;
};

export default IsomorphicSuspense;
