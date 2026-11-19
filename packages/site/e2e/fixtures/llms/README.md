# Scoped LLM integration fixture

Run commands below from `packages/site`, after building the workspace packages and installing Playwright browsers. This fixture mounts independent sources at `/salt` and `/mosaic` with the same internal namespace, plus unscoped pages, aliases and excluded content. It also configures the overlapping `/salt/components` scope.

Before starting any server or build, copy the authored public Markdown fixture once (the command refuses to overwrite an existing file):

```sh
node -e "require('node:fs').copyFileSync('e2e/fixtures/llms/authored.md', 'public/llms-fixture-authored.md', require('node:fs').constants.COPYFILE_EXCL)"
```

Keep that file for all three modes, then remove the copied `public/llms-fixture-authored.md` after testing. The fixture also publishes a canonical `/` page to verify `/.md`, independently of the reference site's HTML homepage redirect.

## Active mode

Start the content server and Next in separate terminals:

```sh
yarn cross-env NODE_ENV=development node ../cli/dist/index.mjs serve --config e2e/fixtures/llms/mosaic.config.mjs --port 8081
yarn cross-env MOSAIC_MODE=active MOSAIC_ACTIVE_MODE_URL=http://localhost:8081 NEXT_PUBLIC_SITE_URL=http://localhost:3100 yarn dev --port 3100
```

Run the fixture tests:

```sh
yarn cross-env MOSAIC_LLMS_FIXTURE=1 MOSAIC_LLMS_ACTIVE=1 PLAYWRIGHT_TEST_BASE_URL=http://localhost:3100 yarn e2e llms-scopes.test.ts --workers=2
```

The Chromium project additionally creates and removes a temporary page to exercise the real source watcher and cache refresh. Other browser projects skip that shared mutation. Allow up to 30 seconds for each active cache refresh.

## Snapshot server

Stop the active servers, generate the snapshot and build the site:

```sh
yarn cross-env NODE_ENV=development node ../cli/dist/index.mjs build --out .tmp/llms-snapshots --name latest --config e2e/fixtures/llms/mosaic.config.mjs
yarn cross-env MOSAIC_MODE=snapshot-file MOSAIC_SNAPSHOT_DIR=.tmp/llms-snapshots/latest NEXT_PUBLIC_SITE_URL=http://localhost:3100 yarn build
yarn cross-env MOSAIC_MODE=snapshot-file MOSAIC_SNAPSHOT_DIR=.tmp/llms-snapshots/latest NEXT_PUBLIC_SITE_URL=http://localhost:3100 yarn start --port 3100
```

In a separate terminal:

```sh
yarn cross-env MOSAIC_LLMS_FIXTURE=1 PLAYWRIGHT_TEST_BASE_URL=http://localhost:3100 yarn e2e llms-scopes.test.ts --workers=2
```

## Static export

Using the same snapshot:

```sh
yarn cross-env MOSAIC_SNAPSHOT_DIR=.tmp/llms-snapshots/latest NEXT_PUBLIC_SITE_URL=http://localhost:3100 yarn build:static:file
```

Serve `out/` with a static HTTP server that resolves extensionless URLs to their exported `.html` files, serves `.txt` as `text/plain` and `.md` as `text/markdown`, and returns 404 for missing files. Set the test URL to that server:

```sh
yarn cross-env MOSAIC_LLMS_FIXTURE=1 MOSAIC_LLMS_STATIC=1 PLAYWRIGHT_TEST_BASE_URL=http://localhost:3100 yarn e2e llms-scopes.test.ts --workers=2
```

Static checks cover exported files and initial HTML discovery without JavaScript. They omit server-only content negotiation and response headers, which require host configuration. The existing `staticExport.test.ts` expects the full reference-site snapshot (at least 20 Mosaic pages); run it against that snapshot, not this deliberately small fixture.
