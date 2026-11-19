---
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-site-components': patch
---

Support a separate authoring site for Edit and New Page actions, with pending configuration hiding editor entry points. The reference site resolves the destination at runtime for server deployments, including prerendered snapshots, and normalizes server redirects consistently with browser links. Static exports use build-time configuration.
