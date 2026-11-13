---
'@jpmorganchase/mosaic-plugins': patch
---

Check links in `BrokenLinksPlugin` with `undici` instead of `check-links`, which removes `got`, `cacheable-request` and `http-cache-semantics` (SNYK-JS-HTTPCACHESEMANTICS-19964068) from Mosaic's dependencies. Links are checked the same way: a `HEAD` request that falls back to a retried `GET`, the same timeout and headers, and `proxyEndpoint` still only applies to `https:` links.
