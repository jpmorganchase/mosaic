'use client';

import { ComponentType, FC, useCallback, useRef, useState } from 'react';
import matter from 'gray-matter';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import Split from 'react-split';
import { $convertFromMarkdownString } from '@lexical/markdown';
import type { SerializeResult } from 'next-mdx-remote-client/serialize';

import transformers from '../transformers';
import ContentEditor from './ContentEditor';
import { nodes } from '../nodes';
import { EditorProvider, usePreviewContent, type EditorUser } from '../EditorContext';
import { PreviewPlugin } from '../plugins/PreviewPlugin';
import styles from './Editor.css';
import Toolbar from './Toolbar/Toolbar';
import theme from '../theme';
import { PersistDialog, type PersistEvent } from './PersistEditDialog';
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

export interface PreviewComponentProps {
  /**
   * Compiled MDX payload produced by `compilePreview`. `undefined`
   * until the first compile completes.
   */
  source: SerializeResult | undefined;
  meta?: Record<string, unknown>;
  components: Record<string, unknown>;
}

export interface EditorProps {
  content: string;
  components: Record<string, unknown>;
  PreviewComponent: ComponentType<PreviewComponentProps>;
  /** Server Action that compiles MDX → serialised renderer payload. */
  compilePreview: (markdown: string) => Promise<SerializeResult>;
  /** Optional Server Action that streams progress for a save. */
  persist?: (input: {
    route: string;
    markdown: string;
  }) => Promise<AsyncIterable<PersistEvent>> | AsyncIterable<PersistEvent>;
  /** Currently-signed-in user. */
  user?: EditorUser;
}

const gutter = () => {
  const gutterEl = document.createElement('div');
  gutterEl.className = styles.gutter;
  return gutterEl;
};

// Split so it can consume `usePreviewContent`, which requires the
// `EditorProvider` mounted by the outer component.
const EditorInner: FC<EditorProps> = ({
  components,
  content,
  compilePreview,
  persist,
  PreviewComponent
}) => {
  const previewContent = usePreviewContent();
  const [saveOpen, setSaveOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { data: meta, content: markdown } = matter(content);

  // Stable handler — `setSaveOpen` from useState is itself stable,
  // but wrapping it lets us keep `<Toolbar>` API single-purpose
  // (open the save dialog) without leaking the dispatcher's
  // `SetStateAction` shape.
  const openSave = useCallback(() => setSaveOpen(true), []);

  return (
    <LexicalComposer
      initialConfig={{
        ...initialConfig,
        editorState: () => $convertFromMarkdownString(markdown, transformers)
      }}
    >
      <div className={styles.root}>
        <div className={styles.toolbarContainer}>
          <Toolbar onSave={openSave} />
          <PersistDialog
            open={saveOpen}
            onOpenChange={setSaveOpen}
            meta={meta}
            persist={persist}
          />
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
            <ScrollableSection className={styles.focused} ref={containerRef}>
              <ContentEditor />
            </ScrollableSection>
            <ScrollableSection>
              <PreviewComponent source={previewContent} meta={meta} components={components} />
            </ScrollableSection>
          </Split>
          <HistoryPlugin />
          <ListPlugin />
          <TablePlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={transformers} />
          <PreviewPlugin compilePreview={compilePreview} />
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

const Editor: FC<EditorProps> = props => (
  <EditorProvider initialUser={props.user}>
    <EditorInner {...props} />
  </EditorProvider>
);

export default Editor;
