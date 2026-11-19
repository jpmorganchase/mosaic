---
'@jpmorganchase/mosaic-source-git-repo': patch
---

Fetch a source's requested branch before creating its worktree in a reused clone,
so branches published after the initial clone can start without deleting the cache.
Keep refreshes scoped to each source's branch when multiple sources share a clone.
