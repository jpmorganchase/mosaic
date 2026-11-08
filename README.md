# Mosaic

Mosaic is a **content aggregating, headless CMS solution** which can be ran with server side rendering (SSR) or as a statically generated site (SGS).

- Running with SSR enables you to publish updates in realtime, just by updating the originating source.
- Running as a SGS enables you to create an immutable snapshot of your content which will not update in realtime.

## How To Create Your Own Mosaic Site

You can copy the `site` directory from this repository into your project. The site directory is a standard Next.js app that loads the packages created by this repo, with an additional `mosaic-config.mjs` file to configure sources and other settings.

## Serving A Dynamic, Server Side Rendered Site

To serve your site, pulling dynamic content in realtime and rendering with SSR

Create the required environment variables

```
> export MOSAIC_DOCS_CLONE_CREDENTIALS="<git user>:<git PAT token>"
> yarn serve
```

## Serving a Statically Generated Site

A snapshot is an immutable copy of the content pulled from your configured data sources.

To serve a snapshot as a SGS, use `snapshot-file` mode, which reads snapshots stored as files within this repo so you can deploy your site and content together.

### To create a snapshot of your content

```
> export MOSAIC_DOCS_CLONE_CREDENTIALS="<git user>:<git PAT token>"
> yarn gen:snapshot
```

This will create a snapshot in `packages/site/public/snapshots/latest`.

### To serve from local snapshot

`yarn serve:snapshot:file`
