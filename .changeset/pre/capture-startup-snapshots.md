---
'@jpmorganchase/mosaic-cli': patch
---

Subscribe to source updates before starting snapshot builds so a fast source cannot publish its first update before the CLI listens. Wait for every enabled source's first update and completed startup before writing or scoping the snapshot, then stop the sources. Repeated updates from one source cannot stand in for another source.
