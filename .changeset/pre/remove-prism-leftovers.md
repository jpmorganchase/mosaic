---
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-site-preset-styles': patch
---

Remove the Prism code highlighter left over from the move to Shiki

- `@jpmorganchase/mosaic-content-editor-plugin` imports its code nodes from
  `@lexical/code-core` instead of `@lexical/code`. The editor never turned on
  Lexical's Prism highlighting, but `@lexical/code` bundled it anyway, adding
  about 22 KB (gzipped) to the editor's JavaScript. Code blocks behave the same.
- `@jpmorganchase/mosaic-site-preset-styles` no longer imports
  `prismjs/themes/prism.css` or depends on `prismjs`. Mosaic highlights code
  with Shiki, so these global styles only affected `ReactLive`'s code editor.
  Sites that style their own Prism output should import the Prism theme they
  want directly.
