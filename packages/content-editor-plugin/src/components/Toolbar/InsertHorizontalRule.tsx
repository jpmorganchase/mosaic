import { Icon } from '@jpmorganchase/mosaic-components';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { ToolbarButton } from './ToolbarButton';

export const InsertHorizontalRule = () => {
  const [editor] = useLexicalComposerContext();

  const handleClick = () => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  };
  return (
    <ToolbarButton onClick={handleClick} label="Insert Divider">
      <Icon name="minimize" />
    </ToolbarButton>
  );
};
