---
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-schemas': patch
'@jpmorganchase/mosaic-site': patch
'@jpmorganchase/mosaic-standard-generator': patch
---

## Source Pushing

The Mosaic CLI provides an endpoint `/sources/add/` that allows a new source to be pushed to a running instance of Mosaic.

To do this you make a POST request with a JSON body composed of

- a `name` property
- a `definition` property

### Example request body

Pushing a new git repo source:

```
{
    "name":"my-docs-preview",
    "definition": {
      "modulePath": "@jpmorganchase/mosaic-source-git-repo",
      "namespace": "my-docs",
      "options": {
        "credentials":<access-token>,
        "prefixDir": "my-docs",
        "cache": true,
        "subfolder": "docs",
        "repo": <repo-url>,
        "branch": "main",
        "extensions": [".mdx"],
        "remote": "origin"
      }
    }
}
```

## Notes

By default, these sources are marked as a "preview" which means `preview-` is appended to the source namespace and certain plugins will not be run on this source e.g. search and sitemap plugins.

You can disabled this behavior in 2 ways:

1. send the property `isPreview` with the value of false as part of the POST request body
2. modify plugin definitions in the mosaic config file to set `previewDisabled` to be false for all plugins you wish have run on this source.
