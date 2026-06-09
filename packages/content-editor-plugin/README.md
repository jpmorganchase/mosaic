# Mosaic Plugin Content Editor

`@jpmorganchase/mosaic-content-editor-plugin` is a Mosaic plugin which supports editing Markdown documents within the browser.

## Installation

```sh
yarn add @jpmorganchase/mosaic-content-editor-plugin
```

## Keyboard shortcuts

Shortcuts are available while the editor is mounted (`?edit=1`). On macOS the `Mod` modifier is `⌘`; on Windows / Linux it's `Ctrl`.

| Action            | Shortcut          | Notes                                                                                                                   |
| ----------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Bold**          | `Mod + B`         | Built into Lexical's `RichTextPlugin`; toolbar button advertises it via tooltip + `aria-keyshortcuts`.                  |
| **Italic**        | `Mod + I`         | As above.                                                                                                               |
| **Undo**          | `Mod + Z`         | Built into Lexical's `HistoryPlugin`.                                                                                   |
| **Redo**          | `Mod + Shift + Z` | As above.                                                                                                               |
| **Insert link**   | `Mod + K`         | Wired in `KeyboardShortcutsPlugin`. Opens the Insert Link dialog with the current selection pre-filled.                 |
| **Save**          | `Mod + S`         | Wired in `KeyboardShortcutsPlugin`. Opens the save / Pull-Request dialog. `preventDefault`s the browser "Save Page As". |
| **Shortcut help** | `Mod + /`         | Toggles the in-app cheatsheet dialog. Same dialog opens via the `?` icon on the right of the toolbar.                   |
| **Close dialog**  | `Esc`             | Standard Salt `Dialog` behaviour; suppressed while a save is in flight so an accidental Esc can't dismiss progress.     |

A complete, up-to-date list is also rendered **inside the editor itself** — open it with `Mod + /` or click the `?` button on the right side of the toolbar. The dialog is data-driven from the same `SHORTCUTS` map this table is documented from, so it can never drift out of sync.

The canonical shortcut table lives in [`src/utils/shortcuts.ts`](./src/utils/shortcuts.ts) and is the single source of truth — adding a new binding means appending one row there (plus a label in `SHORTCUT_LABELS`) and either registering it with Lexical's command system (for text-format bindings) or extending `KeyboardShortcutsPlugin` (for editor-app bindings).

Tooltip labels are formatted per-platform: `Bold ⌘B` on macOS, `Bold Ctrl+B` elsewhere. Screen readers get the same information via `aria-keyshortcuts` on the button itself.
