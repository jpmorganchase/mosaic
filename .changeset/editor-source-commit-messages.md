---
'@jpmorganchase/mosaic-cli': minor
'@jpmorganchase/mosaic-content-editor-plugin': minor
'@jpmorganchase/mosaic-core': minor
'@jpmorganchase/mosaic-schemas': minor
'@jpmorganchase/mosaic-source-git-repo': patch
'@jpmorganchase/mosaic-types': minor
'@jpmorganchase/mosaic-workflows': minor
---

Add source-specific commit message defaults and editable messages in the save dialog, with an
authenticated, side-effect-free workflow defaults endpoint. Existing custom hosts and workflows
can continue saving without opting into message editing.

Both Git providers now use neutral create/update/rename defaults and preserve configured or
submitted text. Pull request titles use the message's first nonempty line with the configured
`titlePrefix`; commits retain the full message. Messages are validated before Git writes, with
CRLF normalized to LF and an 8 KiB UTF-8 limit.

Commit without Git whitespace cleanup so author spacing and blank lines survive in the stored
commit message. Git supplies a terminal newline when the message has none.

Preserve the pristine save baseline when the first visual-editor visit follows source edits,
so changing modes cannot incorrectly disable saving the draft.
