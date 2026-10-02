---
'@jpmorganchase/mosaic-cli': major
'@jpmorganchase/mosaic-content-editor-plugin': minor
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-layouts': minor
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-middleware': minor
'@jpmorganchase/mosaic-source-local-folder': patch
'@jpmorganchase/mosaic-store': minor
'@jpmorganchase/mosaic-workflows': patch
---

Secure the content server and editor, fix the save flow, and slim the App Router site

### Breaking changes

**`@jpmorganchase/mosaic-cli`**

- The `/workflows` WebSocket only runs workflows for messages carrying
  `token` = `MOSAIC_WORKFLOWS_SECRET`; without that env var no workflow
  runs. Messages are validated (workflow name, user, route) and capped
  at 5 MB.
- Admin endpoints other than `/_mosaic_/tags/list` require
  `MOSAIC_ADMIN_SECRET`: sent as `x-mosaic-admin-secret`, a bearer token,
  or the password of the browser login prompt (HTTP Basic). Without the
  env var they are open when `NODE_ENV=development` and disabled
  otherwise.
- CORS headers are no longer sent to every origin. Allow specific
  origins with `MOSAIC_CORS_ORIGINS` (comma-separated).

**Reference site (`packages/site`)**

- Editing requires `MOSAIC_EDITORS` (emails, `@domains` or `*`); when it
  is unset nobody can sign in or edit in production. Set
  `MOSAIC_EDITORS=*` to keep the previous "anyone who can sign in"
  behaviour.
- Saves need `MOSAIC_WORKFLOWS_URL` and `MOSAIC_WORKFLOWS_SECRET`
  (renamed from `NEXT_PUBLIC_MOSAIC_WORKFLOWS_URL`).
- The committed `.env.local` is now `.env.development`, which Next.js
  only loads for `next dev`. Production builds no longer pick up its
  placeholder `AUTH_SECRET` or dev-only flags, and the site refuses the
  placeholder secrets when `NODE_ENV=production`.
- `.env.prod` is renamed to `.env.production`, the name Next.js actually
  loads for `next build` / `next start`. Production builds therefore now
  default to `MOSAIC_MODE=snapshot-file`; set `MOSAIC_MODE=active` for
  deployments that read from a running Mosaic CLI.

### Fixes

- **Saving works again.** The CLI echoes the caller's channel (the site
  had switched to a different channel hash, so every progress message
  was dropped and saves never finished), new pages can be created (the
  CLI required the route to exist already, and the editor had no route
  for a new page), and saves time out (`MOSAIC_WORKFLOWS_TIMEOUT_MS`,
  default 5 minutes) and always close their socket.
- Workflow failures are reported to the editor instead of crashing the
  CLI with an unhandled rejection. The GitHub workflow accepts the
  site's `sid` when no `id` is sent.
- Routes are validated before they are forwarded, and workflows refuse
  to write or rename files outside the source's content folder.
- Symlinks inside a content folder can no longer publish files from
  outside it (local-folder and git-repo sources, and the CLI's
  `/_mosaic-raw/*` route).
- Admin responses no longer overwrite git credentials in the live
  config with the redacted value.
- Search results escape the indexed text before highlighting (it was
  rendered as HTML), escape the query before building a regex, and
  search the current input rather than the previous keystroke.
- Frontmatter edits are kept when the author leaves the Frontmatter tab
  before saving, and frontmatter-only or first source-mode edits now
  count as unsaved changes.
- `LayoutProvider` accepts the server's `isEditing` state, so
  prerendered pages render their real layout (sidebar, breadcrumbs,
  header controls) in the HTML instead of falling back to client
  rendering.
- The Lexical editor is no longer part of every page's JavaScript:
  `@jpmorganchase/mosaic-content-editor-plugin` exposes subpath exports
  (`/useEditMode`, `/LayoutNamesContext`, `/components/EditorControls`,
  …) and the site lazy-loads the editor from a Client Component.
- Loader caches never store not-found results. Active mode can opt in to
  cross-request caching with `MOSAIC_ACTIVE_MODE_CACHE=true`. Compiled
  MDX is cached by content hash.
- `/api/revalidate` expires the content cache immediately
  (`{ expire: 0 }`) rather than serving stale content once more.
- Per-page stores are released when the page unmounts (`disposeStore`)
  instead of leaking a store and a `storage` listener per navigation.

### Additions

- `@jpmorganchase/mosaic-content-editor-plugin`: `EditModeProvider`,
  `useIsEditing` and `useEditModeActions`; `<Editor route>` prop.
- `@jpmorganchase/mosaic-store`: `registerStore` and `disposeStore`.
- `@jpmorganchase/mosaic-site-middleware`, `-layouts` and
  `-site-components` now declare `next` as a peer dependency.
