---
'@jpmorganchase/mosaic-cli': patch
---

Keep the reference site's development revalidation URL alongside its shared secret, so source updates still invalidate the site cache after moving settings into environment files. Validate the committed defaults in regression tests and align site validation with the supported active and snapshot-file modes.
