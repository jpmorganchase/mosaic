# Snapshot-mode Docker example

Single-container example for running a Mosaic site in **snapshot-file
mode**: the content is baked into a snapshot at build time and served by
the Next.js site without an upstream content server.

The site image is built from `packages/site`, which is App Router only
(see [`packages/site/README.md`](../../../packages/site/README.md)).

## Prerequisites

The checked-in `packages/site/snapshots/latest` works out of the box. To refresh it:

```bash
yarn install --immutable
yarn build
yarn workspace @jpmorganchase/mosaic-site gen:snapshot
# → packages/site/snapshots/latest/
```

Always build from the repository root. The Dockerfile installs all workspaces
with the pinned Yarn release and reads `packages/site/snapshots/latest`.

## Build & run

From the repo root:

```bash
docker build -f examples/docker/snapshot-mode/Dockerfile -t mosaic-snapshot .
docker run --rm -p 3000:3000 mosaic-snapshot
# → http://localhost:3000/mosaic/index
```

## How it works

The Dockerfile builds internal packages and the site, then copies Next
standalone output and the snapshot into the same monorepo layout. Snapshot
changes intentionally rebuild the site so pre-rendered data stays consistent.
At runtime the container sets:

- `MOSAIC_MODE=snapshot-file`
- `MOSAIC_SNAPSHOT_DIR=snapshots/latest`

and runs the Next.js standalone server.

## When to use this

Use snapshot mode when you want a production-ready container with
content frozen at build time — fast, deterministic, redeployable.

If you don't need any Node-runtime feature (auth, content preview,
revalidate, `next/image` optimisation), prefer the
[static-export image](../static-export/) instead — it's an nginx-only
runtime, far smaller and cheaper to run.

See [`docs/configure/modes/snapshot-file.mdx`](../../../docs/configure/modes/snapshot-file.mdx).
