import { ElementTransformer } from '@lexical/markdown';
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode
} from '@lexical/react/LexicalHorizontalRuleNode';
import { LexicalNode } from 'lexical';

export const HORIZONTAL_RULE: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => ($isHorizontalRuleNode(node) ? '---' : null),
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: parentNode => {
    const line = $createHorizontalRuleNode();

    if (parentNode.getNextSibling() != null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }

    line.selectNext();
  },
  type: 'element'
};
