---
'@jpmorganchase/mosaic-cli': major
---

Validate the environment when the site and the CLI start

Environment variables are still the only configuration, but each process
now checks them in one place when it starts and lists every problem as
`NAME: reason`, instead of failing later with a feature that silently
does nothing.

### Breaking changes

**`@jpmorganchase/mosaic-cli`**

`mosaic serve` now exits with code 1, before any source loads, when its
environment is invalid. Configurations it used to accept that now stop
it:

- `MOSAIC_REVALIDATE_URL` without `MOSAIC_REVALIDATE_SECRET`. Before,
  the revalidate notifier was quietly disabled. The secret on its own is
  still fine, since the site and the CLI can share an env file.
- `MOSAIC_REVALIDATE_URL` or `BITBUCKET_API_URL` that isn't an absolute
  http(s) URL.
- A `MOSAIC_CORS_ORIGINS` entry that isn't an origin
  (`scheme://host[:port]`), such as `example.com`, `*` or
  `https://example.com/`. Browsers never send those, so they never
  matched; the error suggests the origin to use.
- A blank (whitespace-only) `MOSAIC_ADMIN_SECRET`,
  `MOSAIC_WORKFLOWS_SECRET`, `MOSAIC_BITBUCKET_WEBHOOK_SECRET` or
  `MOSAIC_REVALIDATE_SECRET`.
- A `MOSAIC_SOURCE_BOOT_TIMEOUT_MS` that isn't a whole number of
  milliseconds (`0` still waits forever).
- A `MOSAIC_WORKFLOWS_TIMEOUT_MS` that isn't a whole number of
  milliseconds between 1 and 2147483647. Larger values made every save
  time out at once.

The placeholder `MOSAIC_WORKFLOWS_SECRET` from `.env.development` is not
an error: outside `NODE_ENV=development` it still counts as unset.

**Reference site (`packages/site`)**

`src/instrumentation.ts` validates the env (through `src/lib/config.ts`)
when a server starts: `next start`, the standalone `server.js` and
`next dev`. With `NODE_ENV=production` an invalid configuration prints
one error and exits with code 1 (left alone, Next.js would log the error
and answer every request with a 500); `next dev` logs the same list and
keeps running.
`next build` and the static export don't check runtime variables, so
images can still be built without them. Configurations that now stop a
production server:

- `MOSAIC_MODE` other than `active` or `snapshot-file`,
  and `MOSAIC_OUTPUT` other than `export` or `standalone`.
- A missing `MOSAIC_ACTIVE_MODE_URL` in active mode (the default when
  `MOSAIC_MODE` is unset), or `MOSAIC_SNAPSHOT_DIR` in `snapshot-file`
  mode. Every page failed to load without them.
- `MOSAIC_ACTIVE_MODE_URL` or `NEXT_PUBLIC_SITE_URL` that isn't an
  absolute http(s) URL (an invalid `NEXT_PUBLIC_SITE_URL` used to fall
  back to `http://localhost:3000` with a warning), and
  `MOSAIC_WORKFLOWS_URL` that isn't a ws(s) or http(s) URL.
- `MOSAIC_WORKFLOWS_URL` without `MOSAIC_WORKFLOWS_SECRET`.
- A flag other than `true` or `false` (`MOSAIC_AUTH_ENABLED`,
  `MOSAIC_ACTIVE_MODE_CACHE`, `MOSAIC_DISABLE_LOADER_CACHE`,
  `NEXT_PUBLIC_ENABLE_LOGIN`, `NEXT_PUBLIC_OPTIMIZE_IMAGES`,
  `MOSAIC_DEV_FAKE_AUTH`, `MOSAIC_DEV_BYPASS_CAPABILITY_GATE`). Only
  `true` ever turned one on, so `TRUE` or `1` silently meant off.
- A `MOSAIC_EDITORS` entry that isn't an email address, an `@domain` or
  `*`, such as `*@corp.com`, which never matched anyone.

Valid configurations behave as before. The placeholder `AUTH_SECRET` and
`MOSAIC_REVALIDATE_SECRET` from `.env.development` are still ignored in
production rather than rejected; that logic now lives in
`lib/config.ts`. The site's `serve` script no longer sets the revalidate
variables itself: `.env.development` now holds both. The full variable
reference, with types and defaults, is in `packages/site/README.md` and
`docs/configure/admin`.
