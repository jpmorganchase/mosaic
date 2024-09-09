import * as React from 'react';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

const ContentEditor = () => (
  <RichTextPlugin
    contentEditable={<ContentEditable />}
    placeholder={<div>Enter some text...</div>}
    ErrorBoundary={LexicalErrorBoundary}
  />
);

export default ContentEditor;
