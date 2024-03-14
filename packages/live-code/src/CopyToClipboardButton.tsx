import { Icon, ToolbarButton } from '@jpmorganchase/mosaic-components';
import { useEffect, useState, useTransition } from 'react';

type CopyButtonState = 'success' | 'error' | 'initial';

interface CopyToClipboardButtonProps {
  text: string;
}

export const CopyToClipboardButton = ({ text }: CopyToClipboardButtonProps) => {
  const [isPending, startTransition] = useTransition();
  const [copyState, setCopyState] = useState<CopyButtonState>('initial');

  const handleClick = () => {
    try {
      navigator.clipboard.writeText(text);
      startTransition(() => setCopyState('success'));
    } catch (e) {
      console.error('Unable to copy code');
      startTransition(() => setCopyState('error'));
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (copyState !== 'initial') {
        startTransition(() => setCopyState('initial'));
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [copyState]);

  return (
    <ToolbarButton
      label="Copy code"
      tooltipPlacement="top"
      onClick={handleClick}
      disabled={isPending}
    >
      {copyState === 'initial' && <Icon aria-label="Copy to clipboard" name="copy" />}
      {copyState === 'success' && <Icon aria-label="Copied" name="success" />}
      {copyState === 'error' && <Icon aria-label="Copied" name="success" />}
    </ToolbarButton>
  );
};
