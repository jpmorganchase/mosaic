# Mosaic Plugin Content Editor

`@jpmorganchase/mosaic-content-editor-plugin` is a Mosaic plugin which supports editing Markdown documents within the browser.

## Installation

```sh
yarn add @jpmorganchase/mosaic-content-editor-plugin
```

## Saving

`<Editor persist={...}>` takes a function that starts a save and returns its progress as an async iterable of `PersistEvent`s (`progress`, then `complete` or `error`). A thrown error is shown as a failed save.

For existing pages, supply `rawSource={{ kind: 'raw', bytes, namespace }}` with the original source file and `route` with its backing path. The editor seeds the editable body and frontmatter from these authored bytes; `content` supplies processed metadata for the preview. If the original source cannot be loaded, saving is disabled so expanded fragments and other plugin output cannot overwrite the source. A new page may use its authored `content` template with `isNewPage`.

Frontmatter drafts, including invalid YAML, survive mode switches. Correct invalid edits before saving. Changing the backing route or source namespace starts a fresh editor session. Source directives are preserved in saves; the preview compiles authored MDX and does not run the source's build plugins, so it may differ from the published rendering of included fragments.

The reference site starts the save on its server and follows it over Server-Sent Events with `subscribeToSave`:

```tsx
import { Editor, subscribeToSave } from '@jpmorganchase/mosaic-content-editor-plugin';
import { startSave } from './persistAction'; // Server Action returning { jobId } or { error }

async function persist(input) {
  const started = await startSave(input);
  if ('error' in started) throw new Error(started.error);
  return subscribeToSave(started.jobId);
}

<Editor persist={persist} {...otherProps} />;
```

`subscribeToSave(jobId, options?)` opens an `EventSource` on `/api/workflows/<jobId>/events` (change it with `options.url`). It expects `progress` events and a final `done` event with `{ status: 'SUCCESS' | 'ERROR', message }`, and closes the stream after `done`. If the stream drops, `EventSource` reconnects and resumes from the last event it received; after `options.maxReconnects` failed attempts in a row (default 3), or if the server refuses the stream, the save is reported as an error.

Successful GitHub and Bitbucket workflows send `message: { pullRequestUrl }`, where the URL opens the pull request in a browser. `subscribeToSave` also accepts older GitHub URL strings and Bitbucket `links.self` responses. A successful workflow may omit the URL: the dialog still confirms the save and prevents another submission.

## Navigation protection

Dirty drafts and pending saves prompt before ordinary links or programmatic navigation. Completed saves do not prompt. Back/Forward navigation within the same document is guarded when the browser exposes a **cancelable Navigation API `navigate` event**. Keep editing retains the mounted editor; Discard follows the original history entry. Mode-only switches in edit and create sessions are allowed.

This does not provide universal Back/Forward protection: browsers without the Navigation API, and traversals the browser marks non-cancelable, continue normally and can lose unsaved drafts. Browsers deliberately limit cancellation of repeated traversal attempts. Cross-document navigation continues to rely on the native `beforeunload` prompt. See the [HTML navigation specification](https://html.spec.whatwg.org/dev/nav-history-apis.html#the-navigate-event).

The reference site's production regression uses synthetic loopback content, a synthetic authenticated session, and local workflow events; it never writes to a repository. After building internal packages and an active site, run it from the repository root:

```sh
yarn build
MOSAIC_MODE=active \
MOSAIC_ACTIVE_MODE_URL=http://127.0.0.1:1 \
MOSAIC_AUTH_ENABLED=true \
MOSAIC_EDITORS=editor@example.test \
AUTH_SECRET=test-token-placeholder \
yarn workspace @jpmorganchase/mosaic-site build
node packages/site/scripts/check-editor-history.mjs
MOSAIC_TEST_BROWSER=firefox node packages/site/scripts/check-editor-history.mjs
MOSAIC_TEST_BROWSER=webkit node packages/site/scripts/check-editor-history.mjs
```

Install the corresponding Playwright browsers first. `MOSAIC_TEST_BROWSER_EXECUTABLE` optionally selects an existing browser binary. The check fails if a browser cannot provide the required traversal protection; this distinguishes a compatibility limit from a successful regression run.

The focused CI job runs Chromium and Firefox. WebKit remains a separate diagnostic: in WebKit 27.2, a second Back after Keep editing uses a native `beforeunload` prompt instead of another cancelable `navigate` event. Dismissing that prompt retains the draft, but it does not satisfy the harness's custom-dialog/history-ordering expectations. The harness logs and dismisses native prompts; it never automatically consents to discard work.

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
