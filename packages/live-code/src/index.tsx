'use client';

import { SyntheticEvent, useState } from 'react';
import { Toolbar, Tooltray, ToolbarButton, Icon, Link } from '@jpmorganchase/mosaic-components';
import { useLiveRunner, CodeEditor, type Scope, type Language } from 'react-live-runner';
import { ToggleButtonGroup, ToggleButton, SaltProvider, Mode } from '@salt-ds/core';

import { CopyToClipboardButton } from './CopyToClipboardButton';

export interface LiveCodeProps {
  code?: string;
  scope?: Scope;
  language?: Language;
  children?: string;
  apiUrl?: string;
  sourceUrl?: string;
}

const LiveCode = ({
  apiUrl,
  children,
  code: codeProp,
  scope,
  language = 'jsx',
  sourceUrl
}: LiveCodeProps) => {
  const initialCode = codeProp ? codeProp.trim() : children || '';

  const { element, error, code, onChange } = useLiveRunner({
    initialCode: initialCode.replace(/\n$/, ''),
    scope
  });

  const [selectedColorMode, setSelectedColorMode] = useState<Mode>('light');

  const handleUndo = () => onChange(initialCode);

  const handleToggleColorMode = (event: SyntheticEvent<HTMLButtonElement>) =>
    setSelectedColorMode(event.currentTarget.value as Mode);

  return (
    <>
      <Toolbar>
        <Tooltray aria-label="history tooltray">
          <ToolbarButton label="Undo all changes" tooltipPlacement="top" onClick={handleUndo}>
            <Icon aria-label="undo all changes" name="undo" />
          </ToolbarButton>
          <CopyToClipboardButton text={code} />
          <ToggleButtonGroup value={selectedColorMode} onChange={handleToggleColorMode}>
            <ToggleButton value="light">Light</ToggleButton>
            <ToggleButton value="dark">Dark</ToggleButton>
          </ToggleButtonGroup>
        </Tooltray>
        <Tooltray aria-label="history tooltray" align="right">
          {apiUrl ? <Link href={apiUrl}>API</Link> : null}
          {sourceUrl ? <Link href={sourceUrl}>Source</Link> : null}
        </Tooltray>
      </Toolbar>

      <CodeEditor value={code} onChange={onChange} language={language} />

      <SaltProvider applyClassesTo="child" mode={selectedColorMode}>
        <div>{element} </div>
      </SaltProvider>

      {error && <pre>{error}</pre>}
    </>
  );
};

export default LiveCode;
