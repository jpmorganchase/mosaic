import React from 'react';
import { Dropdown, SelectionChangeHandler } from '@salt-ds/lab';
import { $createCodeNode } from '@lexical/code';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { $createHeadingNode, $createQuoteNode, HeadingTagType } from '@lexical/rich-text';
import { $wrapNodes } from '@lexical/selection';
import { $createParagraphNode, $getSelection, $isRangeSelection, LexicalEditor } from 'lexical';

interface BlockSourceType {
  name: string;
  type: string;
}

const itemToString = (item?: BlockSourceType | null) => (item ? item.name : '');

const headings = [
  { name: 'Heading 1', type: 'h1' },
  { name: 'Heading 2', type: 'h2' },
  { name: 'Heading 3', type: 'h3' },
  { name: 'Heading 4', type: 'h4' },
  { name: 'Heading 5', type: 'h5' },
  { name: 'Heading 6', type: 'h6' }
];

const source = [
  { name: 'Bulleted List', type: 'bullet' },
  { name: 'Code Block', type: 'code' },
  ...headings,
  { name: 'Numbered List', type: 'number' },
  { name: 'Paragraph', type: 'paragraph' },
  { name: 'Quote', type: 'quote' }
];

export function InsertBlockDropdown({
  editor,
  type: blockSourceType
}: {
  editor: LexicalEditor;
  type: string;
}): JSX.Element {
  const formatParagraph = (item: BlockSourceType) => {
    if (item.type === 'paragraph') {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          $wrapNodes(selection, () => $createParagraphNode());
        }
      });
    }
  };

  const formatHeading = (item: BlockSourceType) => {
    if (headings.findIndex(heading => heading.type === item.type) >= 0) {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          $wrapNodes(selection, () => $createHeadingNode(item.type as HeadingTagType));
        }
      });
    }
  };

  const formatBulletList = (item: BlockSourceType) => {
    if (item.type === 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    }
  };

  const formatNumberedList = (item: BlockSourceType) => {
    if (item.type === 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  const formatQuote = (item: BlockSourceType) => {
    if (item.type === 'quote') {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          $wrapNodes(selection, () => $createQuoteNode());
        }
      });
    }
  };

  const formatCode = (item: BlockSourceType) => {
    if (item.type === 'code') {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          if (selection.isCollapsed()) {
            $wrapNodes(selection, () => $createCodeNode());
          } else {
            const textContent = selection.getTextContent();
            const codeNode = $createCodeNode();
            selection.removeText();
            selection.insertNodes([codeNode]);
            selection.insertRawText(textContent);
          }
        }
      });
    }
  };

  const handleSelect: SelectionChangeHandler<BlockSourceType, 'default'> = (_event, item) => {
    if (!item) {
      return;
    }
    formatParagraph(item);
    formatHeading(item);
    formatBulletList(item);
    formatNumberedList(item);
    formatQuote(item);
    formatCode(item);
  };

  const selectedBlockSourceIndex = source.findIndex(item => item.type === blockSourceType);
  return (
    <Dropdown
      ListProps={{
        width: 200
      }}
      defaultSelected={source[selectedBlockSourceIndex]}
      itemToString={itemToString}
      onSelectionChange={handleSelect}
      source={source}
      width={132}
    />
  );
}
