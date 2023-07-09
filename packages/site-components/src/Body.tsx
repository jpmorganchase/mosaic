import React from 'react';
import { MDXRemote } from 'next-mdx-remote';
import { ErrorBoundary } from 'react-error-boundary';
import { useContentEditor, Editor } from '@jpmorganchase/mosaic-content-editor-plugin';
import { useSession } from 'next-auth/react';

import { createMDXScope } from './utils/createMDXScope';
import { Page500 } from './500';

const DefaultFallBackComponent = ({ error: { message: errorMessage = 'unknown' } }) => {
  console.error('An un-handled error created a 500 message');
  console.error(errorMessage);
  return <Page500 />;
};

function MDXRemoteWithErrorBoundary({ components, source, meta = {} }) {
  return (
    <ErrorBoundary FallbackComponent={DefaultFallBackComponent}>
      <MDXRemote components={components} lazy {...source} scope={createMDXScope(meta)} />
    </ErrorBoundary>
  );
}

export function Body({ components = {}, type, ...props }) {
  const { pageState } = useContentEditor();
  const { data: session } = useSession();

  if (pageState !== 'VIEW' && session !== null && type === 'mdx') {
    return (
      <Editor
        user={session?.user}
        content={props.raw}
        source={props.source}
        components={components}
        PreviewComponent={MDXRemoteWithErrorBoundary}
        previewUrl={process.env.NEXT_PUBLIC_MOSAIC_IBCE_PREVIEW_URL}
        persistUrl={process.env.NEXT_PUBLIC_MOSAIC_IBCE_PERSIST_URL}
      />
    );
  }

  if (type === 'mdx') {
    return (
      <div className="wrapper">
        <MDXRemoteWithErrorBoundary
          components={components}
          source={props.source}
          meta={props.source.frontmatter}
        />
      </div>
    );
  }
  // If file is JSON, we expect it to have a `content` attr
  if (type === 'json') {
    return <div className="wrapper">{props.content}</div>;
  }
  return <div className="wrapper">Unsupported file type</div>;
}
