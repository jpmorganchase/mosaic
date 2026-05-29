# Active-mode Docker example

Two-container example for running a Mosaic site in **active mode**: a
Mosaic content server (Mosaic CLI) feeds a Next.js site over HTTP. The
site pulls content fresh on every request, so edits to your source
repos appear without a redeploy.

## Containers

| Dockerfile        | Image         | Purpose                                                                      |
| ----------------- | ------------- | ---------------------------------------------------------------------------- |
| `Dockerfile.fs`   | `mosaic-fs`   | Runs `mosaic serve` — the content/file server                                |
| `Dockerfile.site` | `mosaic-site` | Runs the Next.js site (App Router), reads content from `mosaic-fs` over HTTP |

The site image is built from `packages/site`, which is App Router only
(see [`packages/site/README.md`](../../../packages/site/README.md)). It
talks to `mosaic-fs` via `MOSAIC_ACTIVE_MODE_URL=http://mosaic-fs:8080`.

## Build

From the repo root:

```bash
docker build -f examples/docker/active-mode/Dockerfile.fs   -t mosaic-fs   .
docker build -f examples/docker/active-mode/Dockerfile.site -t mosaic-site .
```

## Run

Both containers need to share a network so the site can resolve
`mosaic-fs`:

```bash
docker network create mosaic-net
docker run -d --name mosaic-fs   --network mosaic-net -p 8080:8080 mosaic-fs
docker run -d --name mosaic-site --network mosaic-net -p 3000:3000 mosaic-site
# → http://localhost:3000/mosaic/index
```

The mosaic-site `package.json` already ships `docker:build` and
`docker:start` scripts that wrap a single-container variant of the same
thing.

## When to use this

Use active mode when content authors are iterating and want their
edits live without a redeploy. For production, prefer
[snapshot mode](../snapshot-mode/) (faster, content frozen at build) or
the [static-export image](../static-export/) (CDN-friendly, no Node
runtime).

See [`docs/configure/modes/active.mdx`](../../../docs/configure/modes/active.mdx).
