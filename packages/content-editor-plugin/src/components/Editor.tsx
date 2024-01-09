import React, { FC, useRef, useState } from 'react';
import classnames from 'clsx';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import Split from 'react-split';
import { $convertFromMarkdownString } from '@lexical/markdown';

import transformers from '../transformers';
import ContentEditor from './ContentEditor';
import { nodes } from '../nodes';
import { useEditorUser } from '../store';
import { PreviewPlugin, type PreviewPluginProps } from '../plugins/PreviewPlugin';
import styles from './Editor.css';
import Toolbar from './Toolbar/Toolbar';
import theme from '../theme';
import { PersistDialog } from './PersistEditDialog';
import StatusBanner from './StatusBanner';
import { MarkdownImagePlugin } from '../plugins/MarkdownImagePlugin';
import { MarkdownLinkPlugin } from '../plugins/MarkdownLinkPlugin';
import { LinkEditor } from './LinkEditor/LinkEditor';
import { ScrollableSection } from './ScrollableSection/ScrollableSection';
import HorizontalRulePlugin from '../plugins/HorizontalRulePlugin';
import { FloatingToolbarPlugin } from '../plugins/FloatingToolbarPlugin';
import { TableActionMenuPlugin } from '../plugins/TableActionMenuPlugin';
import { ContentPreview } from './ContentPreview';

function onError(error: Error) {
  console.error(error);
}

const initialConfig = {
  namespace: 'mosaic-content-editor',
  onError,
  nodes,
  theme
};

export interface EditorProps extends PreviewPluginProps {
  content: string;
  persistUrl?: string;
  user?: any;
  children: React.ReactNode;
}

const gutter = () => {
  const gutterDiv = document.createElement('div');
  gutterDiv.className = styles.gutter;
  return gutterDiv;
};

const Editor: FC<EditorProps> = ({ content, persistUrl, user, meta, children, onChange }) => {
  const { setUser } = useEditorUser();
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleEditorFocus = () => {
    setFocused(true);
    setUser(user);
  };

  const handleEditorBlur = () => {
    setFocused(false);
  };

  return (
    <LexicalComposer
      initialConfig={{
        ...initialConfig,
        editorState: () => $convertFromMarkdownString(content, transformers)
      }}
    >
      <div className={styles.root} onFocus={handleEditorFocus} onBlur={handleEditorBlur}>
        <div className={styles.toolbarContainer}>
          <Toolbar />
          <PersistDialog meta={meta} persistUrl={persistUrl} />
          <StatusBanner />
        </div>
        <div className={styles.editorRoot}>
          <Split
            className={styles.splitter}
            cursor="col-resize"
            direction="horizontal"
            dragInterval={1}
            expandToMin={false}
            gutter={gutter}
            gutterAlign="center"
            minSize={100}
            sizes={[50, 50]}
            snapOffset={30}
          >
            <ScrollableSection
              className={classnames({
                [styles.focused]: focused,
                [styles.unfocused]: !focused
              })}
              ref={containerRef}
            >
              <ContentEditor />
            </ScrollableSection>
            <ScrollableSection>
              <ContentPreview>{children}</ContentPreview>
            </ScrollableSection>
          </Split>
          <HistoryPlugin />
          <ListPlugin />
          <TablePlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={transformers} />
          {onChange ? <PreviewPlugin onChange={onChange} meta={meta} /> : null}
          <MarkdownImagePlugin />
          <MarkdownLinkPlugin />
          <LinkEditor />
          <HorizontalRulePlugin />
          <FloatingToolbarPlugin />
          <TableActionMenuPlugin />
        </div>
      </div>
    </LexicalComposer>
  );
};

export default Editor;
