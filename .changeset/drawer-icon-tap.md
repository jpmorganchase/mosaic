---
'@jpmorganchase/mosaic-components': patch
---

Keep the mobile header drawer open when its menu icon is tapped

`useOutsideClick` checked whether a click was inside an element with
`contains()` after React had already re-rendered. The header drawer's
trigger hides its icon once the drawer opens, so a tap on the icon looked
like a click outside and closed the drawer straight away. It now uses the
click's `composedPath()`, which is fixed when the click is dispatched.
