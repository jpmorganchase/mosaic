import React from 'react';

export interface IsomorphicSuspenseProps {
  fallback: JSX.Element;
}

export const IsomorphicSuspense: React.FC<IsomorphicSuspenseProps> = ({ children, fallback }) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  return <React.Suspense fallback={fallback}>{children}</React.Suspense>;
};

export default IsomorphicSuspense;
