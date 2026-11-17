---
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-icons': patch
'@jpmorganchase/mosaic-layouts': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-sitemap-component': patch
'@jpmorganchase/mosaic-theme': patch
---

Make public declarations portable for strict React 19 consumers: publish icon name types, provide react-table declarations, express theme recipe results through public structural types, resolve grid/tag declarations explicitly, and require React 19-compatible Salt and react-markdown versions.

Align the editor's Floating UI version with Salt so shared floating contexts retain compatible types.

Let the worker payload type follow TextEncoder's Uint8Array output instead of incorrectly annotating it as Buffer; production behavior is unchanged.
