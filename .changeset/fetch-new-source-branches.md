---
'@jpmorganchase/mosaic-source-git-repo': patch
---

Fetch a source's requested branch before creating its worktree in a reused clone,
so branches published after the initial clone can start without deleting the cache.
The new worktree starts from the latest commit on the branch. If the remote can't be
reached and the clone already has the branch, Mosaic starts from that copy.
Keep refreshes scoped to each source's branch when multiple sources share a clone.
Push editor save branches to the configured Git remote.
