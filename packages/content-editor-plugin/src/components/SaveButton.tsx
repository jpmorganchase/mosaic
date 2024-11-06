import { useState } from 'react';
import { Button, Icon } from '@jpmorganchase/mosaic-components';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';

import { usePageState } from '../store';

export const SaveButton = () => {
  const { setPageState } = usePageState();
  const [isDisabled, setIsDisabled] = useState(true);

  const onChange = () => {
    setIsDisabled(false);
  };

  return (
    <>
      <OnChangePlugin onChange={onChange} ignoreSelectionChange />
      <Button disabled={isDisabled} variant="cta" onClick={() => setPageState('SAVING')}>
        <Icon name="save" /> &nbsp; Save
      </Button>
    </>
  );
};
