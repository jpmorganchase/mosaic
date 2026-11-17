---
'@jpmorganchase/mosaic-content-editor-plugin': patch
---

Ask before Cancel Editing and Stop Editing discard unsaved changes

Both buttons called `stopEditing()`, which used `router.replace` to leave
edit mode straight away. That rendered the page without the editor before
the leave guard saw the URL change, so unsaved changes were lost without a
prompt, and React logged `useInsertionEffect must not schedule updates`.
`stopEditing()` now asks the mounted editor first, which shows the existing
unsaved-changes dialog. Keep editing stays in the editor; Discard changes
leaves edit mode.
