---
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-source-git-repo': patch
---

Keep repository credentials out of command failures and Bitbucket save errors. Capture one Git revision per timestamp batch and consume the bulk map directly, avoiding a subprocess for every cached page.

Retry failed site invalidations with a request deadline and bounded backoff, preserve updates arriving during delivery, and cancel notification work when the server closes. Add `mosaic serve --host` with the existing loopback default so container deployments can explicitly bind to `0.0.0.0`.
