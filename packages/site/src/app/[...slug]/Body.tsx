'use client';

import { Editor, useContentEditor } from '@jpmorganchase/mosaic-content-editor-plugin';
import { SiteState } from '@jpmorganchase/mosaic-loaders';
import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';
import { preview } from 'src/mdx/preview';

export interface BodyProps {
  children?: ReactNode;
  meta: Partial<SiteState>;
  source: string;
}

export function Body({ children, source, meta }: BodyProps) {
  const { pageState } = useContentEditor();
  const { data: session } = useSession();

  if (pageState !== 'VIEW' && session !== null) {
    return (
      <Editor
        meta={meta}
        user={session?.user}
        content={source}
        persistUrl={process.env.NEXT_PUBLIC_MOSAIC_WORKFLOWS_URL}
        onChange={preview}
      >
        {children}
      </Editor>
    );
  }
  return children;
}
