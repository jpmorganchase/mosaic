# Static-export Docker example

Builds the Mosaic site as a fully-static `out/` directory and serves it
from nginx — **no Node.js runtime in the production image**.

## Prerequisites

- A snapshot to build against. Generate one with
  `yarn workspace @jpmorganchase/mosaic-site gen:snapshot` (lands in
  `packages/site/snapshots/latest/`), or arrange S3 access.
- Docker 20.10+ (uses BuildKit syntax for the inline nginx config).

## Build

From the repo root:

```bash
# snapshot-file mode (default)
docker build -f examples/docker/static-export/Dockerfile -t mosaic-static .

# snapshot-s3 mode
docker build \
  -f examples/docker/static-export/Dockerfile \
  --build-arg MOSAIC_MODE=snapshot-s3 \
  -t mosaic-static-s3 .
```

The build runs `yarn build:static:file` (or `build:static:s3`) inside
`packages/site`, which:

1. Applies the API-route stubs (`scripts/static-export-route-stubs.mjs`).
2. Runs `next build` with `MOSAIC_OUTPUT=export`.
3. Reverts the stubs.
4. Emits the static site to `packages/site/out/`.

## Run

```bash
docker run --rm -p 8080:80 mosaic-static
# → http://localhost:8080/mosaic/index
```

## What's in the image

- `nginx:1.27-alpine`
- The contents of `packages/site/out/`
- A minimal nginx config that:
  - serves `try_files $uri $uri.html $uri/ /404.html` so clean URLs work
  - sets a 1-year immutable cache header on `/_next/static/`

## What does **not** work in a static export

The auth, content preview, and revalidate API routes are replaced with
501 stubs at build time and removed from the output. Anything that
depends on a Node runtime — `/api/auth/*`, `/api/content/preview`,
`/api/revalidate`, `next/image` optimisation, `next.config.js`
`redirects()` — won't work here. Run the regular site image
(`examples/docker/active-mode/` or `examples/docker/snapshot-mode/`) if
you need any of those.

See [`docs/configure/modes/static-export.mdx`](../../../docs/configure/modes/static-export.mdx)
for the full feature matrix.
