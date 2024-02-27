---
'@jpmorganchase/mosaic-source-figma': patch
'@jpmorganchase/mosaic-source-storybook': patch
---

Split Storybook endpoint into seperate paths

Previously we used a single url to access `stories.json` and the
linked story. Split this into

- `storiesUrl`: the full url to `stories.json`
- `storyUrlPrefix`: the url to prefix each story reference with

Refactored the `meta` of sources so we refer to the content preview as
'contentUrl`and the link we open in a seperate tab as`link`
