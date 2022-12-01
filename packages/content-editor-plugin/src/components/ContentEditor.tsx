import * as React from 'react';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';

const ContentEditor = () => (
  <RichTextPlugin
    contentEditable={<ContentEditable />}
    placeholder={<div>Enter some text...</div>}
  />
);

export default ContentEditor;
