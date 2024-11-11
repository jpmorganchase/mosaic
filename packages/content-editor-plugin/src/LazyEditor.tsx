import { Suspense, lazy } from 'react';

import type { EditorProps } from './components/Editor';

const LazyEditor = lazy(() => import('./components/Editor'));

export const Editor = (props: EditorProps) => (
  <Suspense fallback={<div>Loading Editor...</div>}>
    <LazyEditor {...props} />
  </Suspense>
);
