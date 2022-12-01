import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';

const nodes = [
  AutoLinkNode,
  CodeHighlightNode,
  CodeNode,
  HeadingNode,
  HorizontalRuleNode,
  LinkNode,
  ListItemNode,
  ListNode,
  QuoteNode,
  TableCellNode,
  TableNode,
  TableRowNode
];

export { nodes };
