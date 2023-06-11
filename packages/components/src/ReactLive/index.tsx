'use client';
import React, { useState } from 'react';
import classnames from 'clsx';
import { Switch } from '@salt-ds/lab';

import { ComponentExample } from '../ComponentExample';
import { getMarkdownComponents } from '../Markdown';
import { IsomorphicSuspense } from '../IsomorphicSuspense';
import styles from './styles.css';

type ReactLiveProps = {
  /** Contents */
  children: string;
  /** className determines the type of language flagged in the MD codeblock */
  className: string;
  /** Scope (including components) for live editor */
  scope?: Record<string, unknown>;
};

const LazyPreviewComponent = React.lazy(() =>
  import('react-live').then(reactLive => ({
    default: ({ className, codeString, scope }) => (
      <PreviewComponent
        className={className}
        codeString={codeString}
        scope={scope}
        {...reactLive}
      />
    )
  }))
);

function PreviewComponent({
  codeString,
  className,
  scope = getMarkdownComponents(),
  LiveProvider,
  LiveEditor,
  LiveError,
  LivePreview: ReactLivePreview
}) {
  const [hidden, setHidden] = useState(true);

  return (
    <LiveProvider
      code={codeString.trim()}
      scope={scope}
      transformCode={code =>
        `${code.replace(/import(?:["'\s]*([\w*{}\n, ]+)from\s*)["'\s]*([@\w/_-]+)["'\s]*;?/gm, '')}`
      }
    >
      <div className={classnames(className, styles.root)}>
        <ComponentExample>
          <ReactLivePreview />
        </ComponentExample>
        <div className={styles.showLiveCodeContainer}>
          <div className={styles.showLiveCode}>
            <Switch label="Show Live Code" role="checkbox" onChange={() => setHidden(!hidden)} />
          </div>
        </div>
        <LiveError className={styles.liveError} />
        {hidden ? null : <LiveEditor className={styles.liveEditor} role="textbox" />}
      </div>
    </LiveProvider>
  );
}

export const ReactLive: React.FC<ReactLiveProps> = ({ children: codeString, className, scope }) => (
  <IsomorphicSuspense fallback={codeString}>
    <LazyPreviewComponent className={className} codeString={codeString} scope={scope} />
  </IsomorphicSuspense>
);
