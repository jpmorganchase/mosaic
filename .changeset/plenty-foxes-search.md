---
'@jpmorganchase/mosaic-content-editor-plugin': patch
---

Fix: Content Editor Websocket

Reduce the risk of the websocket connection from closing due to editing/reviewing for a long period.

The websocket connection is now established when the _save_ button is clicked rather than the _edit_ button.
