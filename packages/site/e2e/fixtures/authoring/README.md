# Runtime authoring fixture

After building the workspace packages, run from `packages/site`:

```sh
node e2e/fixtures/authoring/setup.mjs
yarn cross-env MOSAIC_MODE=snapshot-file MOSAIC_SNAPSHOT_DIR=.tmp/authoring-snapshot MOSAIC_AUTHORING_URL=https://build.example.com yarn build
yarn cross-env MOSAIC_MODE=snapshot-file MOSAIC_SNAPSHOT_DIR=.tmp/authoring-snapshot MOSAIC_AUTHORING_URL=https://runtime.example.com/base yarn start --port 3200
```

In another terminal:

```sh
yarn cross-env MOSAIC_AUTHORING_FIXTURE=1 PLAYWRIGHT_TEST_BASE_URL=http://localhost:3200 yarn e2e authoring-runtime.test.ts
```

The tests check the runtime configuration endpoint, the Edit button, and direct edit/create query links on a prerendered page. External navigation is intercepted locally; no authoring server is needed. Restart the same build without `MOSAIC_AUTHORING_URL` to check that `/api/authoring` returns `{ "url": null }`.

For static export, build with `MOSAIC_AUTHORING_URL=https://static.example.com/base`, `MOSAIC_SNAPSHOT_DIR=.tmp/authoring-snapshot` and `yarn build:static:file`. Serve `out/` with extensionless HTML routes. Run the same tests with `MOSAIC_AUTHORING_STATIC=1`, `MOSAIC_AUTHORING_TEST_URL=https://static.example.com/base` and the static server's `PLAYWRIGHT_TEST_BASE_URL`. They check that no runtime authoring API is requested.
