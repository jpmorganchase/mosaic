import React from 'react';
import { MDXRemote } from 'next-mdx-remote';
import { ErrorBoundary } from 'react-error-boundary';
import { useContentEditor, Editor } from '@dpmosaic/plugin-content-editor';

import { useSession } from './SessionProvider';
import { createMDXScope } from './utils/createMDXScope';
import { Page500 } from './500';
import { Page404 } from './404';

const DefaultFallBackComponent = ({ error: { message: errorMessage = 'unknown' } }) => (
  <Page500 errors={[`Error with page content: ${errorMessage}`]} />
);

function MDXRemoteWithErrorBoundary({ components, source, meta }) {
  return (
    <ErrorBoundary FallbackComponent={DefaultFallBackComponent}>
      <MDXRemote components={components} lazy {...source} scope={createMDXScope(meta)} />
    </ErrorBoundary>
  );
}

export function Body({ components = {}, type, ...props }) {
  const { pageState } = useContentEditor();
  const session = useSession();

  if (props.show404) {
    return <Page404 />;
  }
  if (props.show500) {
    return <Page500 />;
  }

  if (pageState !== 'VIEW' && session.isLoggedIn && type === 'mdx') {
    return (
      <Editor
        user={session.user}
        content={props.raw}
        source={props.source}
        components={components}
        PreviewComponent={MDXRemoteWithErrorBoundary}
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
