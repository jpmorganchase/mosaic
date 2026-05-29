import { useState } from 'react';
import { Button, Icon } from '@jpmorganchase/mosaic-components';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';

interface SaveButtonProps {
  onSave: () => void;
}

export const SaveButton = ({ onSave }: SaveButtonProps) => {
  const [isDisabled, setIsDisabled] = useState(true);

  const onChange = () => {
    setIsDisabled(false);
  };

  return (
    <>
      <OnChangePlugin onChange={onChange} ignoreSelectionChange />
      <Button disabled={isDisabled} variant="cta" onClick={onSave}>
        <Icon name="save" /> &nbsp; Save
      </Button>
    </>
  );
};
