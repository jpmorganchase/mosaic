# Mosaic

Mosaic is a content aggregating, headless CMS solution which can be ran with Server Side Rendering (SSR) or as a Statically Generated Site (SGS).

Running with SSR enables you to publish updates in realtime, just by updating the originating source.
Running as a SGS enables you to create an immutable snapshot of your content which will not update in realtime.

## To Create Your Initial Site

`yarn gen`

This will create a `packages/site` directory containing content, pulled from a local directory path.

This can be re-configured to pull from remote data sources (or both).

## Creating a Server Side Rendered Site

To serve your site, pulling the content in realtime and rendering with SSR

`yarn serve`

## Creating a Statically Generated Site

To create an immutable snapshot of your content for serving as a SGS

`yarn gen:snapshot`

This will create a snapshot in `packages/site/public/snapshots/latest`.

### To serve your snapshot

`yarn serve:snapshot`
