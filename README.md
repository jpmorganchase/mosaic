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

To create a snapshot of your content for serving as a SGS, you have 2 modes.

- `snapshot-file` mode, creates and stores snapshots as files within in this repo so you can deploy your site and content together
- `snapshot-s3` mode, pulls your snapshot from a remote S3 bucket and enables you to deploy site and content seperately

### To create a snapshot of your content

```
> export MOSAIC_DOCS_CLONE_CREDENTIALS="<git user>:<git PAT token>"
> yarn gen:snapshot
```

This will create a snapshot in `packages/site/public/snapshots/latest`.

### To upload your snapshot to an S3 bucket

```
> export MOSAIC_S3_ACCESS_KEY_ID="<S3 bucket access key>"
> export MOSAIC_S3_SECRET_ACCESS_KEY="<S3 bucket secret access key>"
> export MOSAIC_S3_REGION="<S3 bucket region>"
> export MOSAIC_S3_BUCKET="<S3 bucket name>"
> yarn mosaic upload -S <path to snapshot directory>
```

### To serve from local snapshot

`yarn serve:snapshot:file`

### To serve from an S3 bucket

`yarn serve:snapshot:s3`
