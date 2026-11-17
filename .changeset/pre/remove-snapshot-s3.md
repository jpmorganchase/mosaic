---
'@jpmorganchase/mosaic-cli': major
'@jpmorganchase/mosaic-schemas': major
'@jpmorganchase/mosaic-site-middleware': major
'@jpmorganchase/mosaic-types': major
---

Remove the `snapshot-s3` mode and the `mosaic upload` command

S3 snapshot support was unused, so Mosaic now has two content modes,
`active` and `snapshot-file`, and no longer depends on the AWS SDK.

### Breaking changes

**`@jpmorganchase/mosaic-cli`**

- `mosaic upload` and its `-S` / `--snapshot` option are removed. The CLI
  no longer depends on `@aws-sdk/client-s3` or `globby`.

**`@jpmorganchase/mosaic-site-middleware`**

- The loaders (`getMdxRaw`, `getSharedConfig`, `getSearchData`,
  `loadSitemap`, …) no longer read snapshots from S3. The package no
  longer depends on `@aws-sdk/client-s3`, `@aws-sdk/types` or `md5`.

**`@jpmorganchase/mosaic-types`**

- `MosaicMode` is now `'active' | 'snapshot-file'`.

**`@jpmorganchase/mosaic-schemas`**

- `snapshotS3EnvSchema` and the `S3LoaderProcessEnv` type are removed. The
  `MOSAIC_S3_BUCKET`, `MOSAIC_S3_REGION`, `MOSAIC_S3_ACCESS_KEY_ID` and
  `MOSAIC_S3_SECRET_ACCESS_KEY` variables are no longer read.

**Reference site (`packages/site`)**

- The `build:static:s3` and `serve:snapshot:s3` scripts are removed (and
  the root `serve:snapshot:s3` script). `next.config.js` refuses any
  `MOSAIC_MODE` other than `active` or `snapshot-file`, so a leftover
  `snapshot-s3` fails at start-up instead of falling back to active-mode
  fetches with no content URL.

### Migration

Use `snapshot-file` (or `active`) instead of `snapshot-s3`. To keep your
snapshots in S3, sync the folder yourself:

- Upload after `mosaic build`, for example
  `aws s3 sync snapshots/latest s3://your-bucket`.
- Download before building the site, for example
  `aws s3 sync s3://your-bucket snapshots/latest`, then set
  `MOSAIC_MODE=snapshot-file` and `MOSAIC_SNAPSHOT_DIR` to that folder,
  relative to the site's folder.
