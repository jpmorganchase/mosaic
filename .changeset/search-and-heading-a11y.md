---
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-site-components': patch
---

Fix the search input's accessible name and heading roles

- `SearchInput` passed `aria-label="Search"` to Salt's `Input`, which puts
  it on the wrapper `<div>`, so the `<input>` had no accessible name. The
  label is now passed through `inputProps`.
- `Hero` set `role="heading"` without `aria-level` on the container that
  holds its title, description and links. The title is already an `<h1>`,
  so the role is removed.
- The markdown `H0` to `H6` components no longer add a redundant
  `role="heading"` to `<h1>` to `<h6>`.
