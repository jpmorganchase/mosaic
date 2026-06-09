'use client';

/**
 * In-app keyboard-shortcut cheatsheet.
 *
 * Lists every binding registered in `utils/shortcuts.ts`, rendered
 * with Salt's `Table` primitives inside a Salt `Dialog`. The dialog
 * is purely derived from the `SHORTCUTS` + `SHORTCUT_LABELS` maps —
 * there is no hand-curated row list here. Add a binding to
 * `shortcuts.ts` and it automatically appears in the dialog and gets
 * a platform-formatted glyph, with no edit needed in this file.
 *
 * Opened by either:
 *   - clicking the `?` toolbar button (sets `isShortcutHelpOpen` true), or
 *   - pressing `Mod+/` (toggles, so the same shortcut also closes it).
 *
 * Escape-to-close is handled by Salt's `Dialog`; we don't add any
 * extra handling here.
 *
 * Using Salt's `Table` / `TH` / `TD` (rather than native `<table>`)
 * keeps the dialog visually consistent with anything else in the
 * editor that might grow a table later (e.g. an audit-log view) and
 * inherits Salt's theme tokens — borders, padding, density, focus
 * rings — for free, so we don't carry a parallel CSS file just for
 * this one surface. `variant="secondary"` matches dialog body
 * surfaces in Salt's reference designs.
 */

import {
  DialogHeader,
  DialogContent,
  DialogActions,
  Kbd,
  StackLayout,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR
} from '@salt-ds/core';
import { Button } from '@jpmorganchase/mosaic-components';

import { useShortcutHelp } from '../EditorContext';
import {
  formatShortcutTokens,
  SHORTCUTS,
  SHORTCUT_LABELS,
  type ShortcutKey
} from '../utils/shortcuts';
import { Dialog } from './Dialog';

// Keep the rendered order independent of object-iteration order so a
// future addition to `SHORTCUTS` doesn't reshuffle the table. Group
// roughly by category: formatting, history, navigation, app-level,
// help last.
const ORDER: ShortcutKey[] = ['bold', 'italic', 'undo', 'redo', 'insertLink', 'save', 'help'];

export const ShortcutHelpDialog = () => {
  const { isShortcutHelpOpen, setShortcutHelpOpen } = useShortcutHelp();
  return (
    <Dialog
      onOpenChange={setShortcutHelpOpen}
      open={isShortcutHelpOpen}
      aria-label="Keyboard shortcuts"
    >
      <DialogHeader header="Keyboard shortcuts" />
      <DialogContent>
        <Table>
          <THead>
            <TR>
              <TH>Action</TH>
              <TH>Shortcut</TH>
            </TR>
          </THead>
          <TBody>
            {ORDER.map(key => (
              <TR key={key}>
                <TD>{SHORTCUT_LABELS[key]}</TD>
                <TD>
                  {/*
                    Render one `Kbd` per modifier/key token rather than
                    stuffing the whole combo into a single keycap. This
                    matches the convention used by VS Code, GitHub and
                    Linear: each key is its own pill, separated by a
                    small gap, so e.g. `⇧ ⌘ Z` reads as three keys
                    instead of one cramped glyph blob. `StackLayout`
                    (horizontal, gap=1) gives us a theme-token gap with
                    no bespoke css.
                  */}
                  <StackLayout direction="row" gap={1} align="center">
                    {formatShortcutTokens(SHORTCUTS[key]).map((token, i) => (
                      // Token index is a stable key here: the token
                      // list for a given shortcut is fixed at build
                      // time and never reordered between renders.

                      <Kbd key={i}>{token}</Kbd>
                    ))}
                  </StackLayout>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShortcutHelpOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
