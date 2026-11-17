---
'@jpmorganchase/mosaic-content-editor-plugin': patch
---

Protect unsaved editor drafts during cancelable same-document Back/Forward navigation using the native Navigation API. Keep editing retains the draft; Discard resumes the original history entry. Browsers without this API and non-cancelable traversals remain outside this protection.
