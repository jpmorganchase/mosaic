'use client';

import {
  LiveProvider,
  LiveEditor,
  LiveError,
  LivePreview,
  type Scope,
  type Language
} from 'react-live-runner';

export interface LiveCodeProps {
  code?: string;
  scope?: Scope;
  language?: Language;

  children?: string;
}

const LiveCode = ({ children, code: codeProp, scope, language = 'jsx' }: LiveCodeProps) => {
  const code = codeProp ? codeProp.trim() : children || '';

  return (
    <LiveProvider code={code.replace(/\n$/, '')} language={language} scope={scope}>
      <LiveEditor />
      <div style={{ border: '1px solid red', height: 100 }}>
        <LivePreview />
      </div>
      <LiveError />
    </LiveProvider>
  );
};

export default LiveCode;
