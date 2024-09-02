import React, { ComponentType, FC, useRef, useState } from 'react';
import classnames from 'clsx';
import matter from 'gray-matter';
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
import { useEditorUser, usePreviewContent } from '../store';
import { PreviewPlugin } from '../plugins/PreviewPlugin';
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

function onError(error: Error) {
  console.error(error);
}

const initialConfig = {
  namespace: 'mosaic-content-editor',
  onError,
  nodes,
  theme
};

interface PreviewComponentProps {
  source: any;
  meta?: any;
  components: any;
}

interface EditorProps extends PreviewComponentProps {
  content: string;
  PreviewComponent?: ComponentType<PreviewComponentProps>;
  previewUrl?: string;
  persistUrl?: string;
  user?: any;
}

const gutter = () => {
  const gutter = document.createElement('div');
  gutter.className = styles.gutter;
  return gutter;
};

const Editor: FC<EditorProps> = ({
  components,
  content,
  persistUrl,
  PreviewComponent,
  previewUrl,
  source,
  user
}) => {
  const previewContent = usePreviewContent() || source;
  const { setUser } = useEditorUser();
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { data: meta, content: markdown } = matter(content);

  const handleEditorFocus = () => {
    setFocused(true);
    setUser(user);
  };

  const handleEditorBlur = () => {
    setFocused(false);
  };

  console.log(markdown);

  return (
    <LexicalComposer
      initialConfig={{
        ...initialConfig,
        editorState: () => $convertFromMarkdownString(markdown, transformers)
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
              {PreviewComponent && (
                <PreviewComponent source={previewContent} meta={meta} components={components} />
              )}
            </ScrollableSection>
          </Split>
          <HistoryPlugin />
          <ListPlugin />
          <TablePlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={transformers} />
          {previewUrl ? <PreviewPlugin previewUrl={previewUrl} /> : null}
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
