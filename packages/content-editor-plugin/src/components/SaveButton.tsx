import { Button, Icon } from '@jpmorganchase/mosaic-components';

import { useSaveState } from '../EditorContext';
import { ariaKeyshortcuts, formatShortcut, SHORTCUTS } from '../utils/shortcuts';

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
 *
 * `title` + `aria-keyshortcuts` advertise the global `⌘S` / `Ctrl+S`
 * binding wired in `KeyboardShortcutsPlugin`. We use a native `title`
 * rather than a Salt tooltip because Salt's `<Button variant="cta">`
 * isn't wrapped by our `<ToolbarButton>` — adding a Label wrapper
 * here would have to special-case the disabled state, and a native
 * title is good enough for an always-visible CTA where the user can
 * already see the word "Save".
 */
export const SaveButton = ({ onSave }: SaveButtonProps) => {
  const { saveState } = useSaveState();
  const isDisabled = saveState === 'clean' || saveState === 'saving';
  const shortcutLabel = formatShortcut(SHORTCUTS.save);

  return (
    <Button
      disabled={isDisabled}
      variant="cta"
      onClick={onSave}
      title={`Save (${shortcutLabel})`}
      aria-keyshortcuts={ariaKeyshortcuts(SHORTCUTS.save)}
    >
      <Icon name="save" /> Save
    </Button>
  );
};
