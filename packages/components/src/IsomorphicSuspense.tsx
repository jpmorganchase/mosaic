import React, { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Renders `fallback` on the server and while hydrating, then `children`
 * inside a Suspense boundary. The first client render has to match the
 * server HTML: returning `fallback` on the server but a Suspense boundary
 * in the browser made hydration fail on every page that used this.
 * `useSyncExternalStore` reads the server snapshot during hydration and
 * re-renders with the client snapshot straight after.
 */
export function IsomorphicSuspense({ children, fallback }) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  if (!hydrated) {
    return fallback;
  }

  return <React.Suspense fallback={fallback}>{children}</React.Suspense>;
}
