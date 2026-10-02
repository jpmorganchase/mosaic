---
'@jpmorganchase/mosaic-source-local-folder': patch
---

Remove `chokidar` dependency

`fromFsWatch` now uses Node's built-in `fs.watch` instead of `chokidar`. The
public API is unchanged — the returned `Observable` still emits the changed
filename on every change, errors via `subscriber.error`, and completes on
unsubscribe. On platforms / Node versions that don't support recursive
`fs.watch` (notably Linux on Node < 20), watchers are attached to every
subdirectory and to new directories as they appear, preserving the previous
recursive behaviour.

This drops `chokidar` and its transitive dependencies (`anymatch`, `braces`,
`micromatch`, `readdirp`, etc.) from the install graph.
