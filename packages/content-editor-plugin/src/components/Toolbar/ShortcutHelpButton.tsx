import { Icon } from '@jpmorganchase/mosaic-components';

import { useShortcutHelp } from '../../EditorContext';
import { SHORTCUTS } from '../../utils/shortcuts';
import { ToolbarButton } from './ToolbarButton';

/**
 * Opens the keyboard-shortcut cheatsheet dialog. Lives in its own
 * toolbar button rather than buried in an overflow menu because
 * "where do I see the shortcuts?" is exactly the question a new
 * user asks, and a single icon is cheap real-estate compared to
 * making them hunt.
 *
 * Carries the `Mod+/` hint via the standard `shortcut` prop, so the
 * tooltip advertises the keyboard binding the same way every other
 * toolbar button does.
 */
export const ShortcutHelpButton = () => {
  const { isShortcutHelpOpen, setShortcutHelpOpen } = useShortcutHelp();
  return (
    <ToolbarButton
      active={isShortcutHelpOpen}
      onClick={() => setShortcutHelpOpen(true)}
      label="Keyboard shortcuts"
      shortcut={SHORTCUTS.help}
    >
      <Icon name="helpCircle" />
    </ToolbarButton>
  );
};
