'use client';

import { Editor, useContentEditor } from '@jpmorganchase/mosaic-content-editor-plugin';
import { SiteState } from '@jpmorganchase/mosaic-loaders';
import { useSession } from 'next-auth/react';
import type { ReactNode } from 'react';
import type { PreviewAction } from '@jpmorganchase/mosaic-site-components-next';

export interface BodyProps {
  children?: ReactNode;
  meta: Partial<SiteState>;
  source: string;
  previewAction: PreviewAction;
}

export function Body({ children, source, meta, previewAction }: BodyProps) {
  const { pageState } = useContentEditor();
  const { data: session } = useSession();

  if (pageState !== 'VIEW' && session !== null) {
    return (
      <Editor
        meta={meta}
        user={session?.user}
        content={source}
        persistUrl={process.env.NEXT_PUBLIC_MOSAIC_WORKFLOWS_URL}
        onChange={previewAction}
      >
        {children}
      </Editor>
    );
  }
  return children;
}
