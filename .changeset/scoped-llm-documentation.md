---
'@jpmorganchase/mosaic-plugins': minor
'@jpmorganchase/mosaic-site-middleware': minor
'@jpmorganchase/mosaic-types': minor
'@jpmorganchase/mosaic-core': minor
---

Add optional public-path scopes to LlmsTxtPlugin. Preserve the global page index and corpus while generating nested llms.txt and llms-full.txt artifacts, selecting the most-specific index for page discovery, deduplicating aliases and reconciling removed scopes.

Expose a lightweight discovery manifest and server loader, serve allowlisted scoped indexes in active and snapshot modes, and add Markdown Link headers with bounded refresh behavior. The reference site renders canonical HTML discovery links and copies/cleans nested artifacts for static exports.

Add an optional afterSourceRemove plugin hook so LLM artifacts are also reconciled when a running source stops or exits, including the last source. Existing plugin update hooks are not replayed during removal.

Preserve authored public Markdown assets in server builds and serve canonical root-page Markdown at `/.md`, matching its discovery URL. Generated public Markdown copies are retained only for static exports.
