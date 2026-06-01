import { Button, Icon } from '@jpmorganchase/mosaic-components';
import { useSaveState } from '../EditorContext';
import { ariaKeyshortcuts, formatShortcut, SHORTCUTS } from '../utils/shortcuts';
interface SaveButtonProps {
  onSave: () => void;
}
/**
 * Save-trigger button. Reads its disabled state from the shared
 * `useSaveState()` slice so the toolbar button and the save-state
 * pill stay in lockstep.
 *
 * Disabled only while `saving` (to prevent accidental double-
 * submits). We intentionally do NOT disable on `clean` — clicking
 * Save on an unchanged document still opens the dialog, which is
 * the entry point for actions outside dirty-tracking (renaming
 * the page via Mosaic's file-based routing, etc.). The dialog
 * itself gates its "Raise Pull Request" CTA on body / frontmatter
 * / rename deltas.
 *
 * `title` + `aria-keyshortcuts` advertise the global `⌘S` /
 * `Ctrl+S` binding wired in `KeyboardShortcutsPlugin`. Native
 * `title` (not a Salt tooltip) — the CTA already says "Save" and
 * wrapping it would require special-casing the disabled state.
 */
export const SaveButton = ({ onSave }: SaveButtonProps) => {
  const { saveState } = useSaveState();
  const isDisabled = saveState === 'saving';
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
