import { Button, Icon } from '@jpmorganchase/mosaic-components';

import { useSaveState } from '../EditorContext';

interface SaveButtonProps {
  onSave: () => void;
}

/**
 * Save-trigger button. Previously owned its own `isDisabled` state via
 * a local `OnChangePlugin`, which meant the "is the doc dirty?"
 * question was answered in two places (here and the save-state pill).
 * Now reads from the single `useSaveState()` slice so both UI surfaces
 * stay in lockstep — the button is enabled iff there's something to
 * save (`dirty` or `saved` — saved means "saved a while ago, the user
 * may want to bump it again").
 *
 * Disabled while `saving` so accidental double-clicks can't kick off
 * a second persist while the first is in flight.
 */
export const SaveButton = ({ onSave }: SaveButtonProps) => {
  const { saveState } = useSaveState();
  const isDisabled = saveState === 'clean' || saveState === 'saving';

  return (
    <Button disabled={isDisabled} variant="cta" onClick={onSave}>
      <Icon name="save" /> &nbsp; Save
    </Button>
  );
};
