---
'@jpmorganchase/mosaic-plugins': minor
'@jpmorganchase/mosaic-site-middleware': minor
'@jpmorganchase/mosaic-types': minor
---

Add optional public-path scopes to LlmsTxtPlugin. Preserve the global page index and corpus while generating nested llms.txt and llms-full.txt artifacts, selecting the most-specific index for page discovery, deduplicating aliases and reconciling removed scopes.

Expose a lightweight discovery manifest and server loader, serve allowlisted scoped indexes in active and snapshot modes, and add Markdown Link headers with bounded refresh behavior. The reference site renders canonical HTML discovery links and copies/cleans nested artifacts for static exports.
