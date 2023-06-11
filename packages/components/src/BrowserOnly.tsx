'use client';
import React from 'react';

import { canUseDOM } from './canUseDOM';

export function BrowserOnly({
  children,
  fallback
}: {
  children?: () => JSX.Element;
  fallback?: JSX.Element;
}): JSX.Element | null {
  if (!canUseDOM || children == null) {
    return fallback || null;
  }

  return <>{children()}</>;
}
