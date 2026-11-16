# Mosaic Site Preset Styles

`@jpmorganchase/mosaic-site-preset-styles` is an optional package, that composes together all the default styles required by a 'standard' Mosaic site.

## Installation

`yarn add @jpmorganchase/mosaic-site-preset-styles`

Import `@jpmorganchase/mosaic-site-preset-styles/index.css` once in your root
layout. It includes Salt core and icon component CSS before Mosaic's overrides,
as well as Salt theme CSS. Separate imports of `salt-core.css` and `salt-icon.css`
are unnecessary when using this preset.

Runtime style injection remains enabled for compatibility with host extensions.
The preset does not include styles from host-only packages such as `@salt-ds/lab`.
If a host disables Salt's style injection, it must also supply the static styles
for every additional Salt package it uses, including components rendered in portals.
