'use client';
import React from 'react';

export function IsomorphicSuspense({ children, fallback }) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  return <React.Suspense fallback={fallback}>{children}</React.Suspense>;
}
