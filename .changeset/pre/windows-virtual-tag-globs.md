---
'@jpmorganchase/mosaic-core': patch
---

Resolve absolute virtual-filesystem glob patterns and exclusions against the same host root as their working directory. This restores cross-source tag references when generating snapshots on Windows, where tinyglobby otherwise finds no matching tag aliases.
