# @jpmorganchase/mosaic-source-figma

## 0.1.0-beta.95

### Minor Changes

- b7a3aa39: Add Thumbnail cache to reduce impact of Figma rate limits

  The plugin implements a caching mechanism (ThumbnailCache) that:

  - Stores generated thumbnails with configurable TTL (time-to-live).
  - Automatically cleans up older cache entries to prevent disk space issues.
  - Only requests new thumbnails when cache is invalid or missing.
  - Reduces API usage units by minimizing calls to resource-intensive endpoints.

  ```
  {
     modulePath: "@jpmorganchase/mosaic-source-figma",
     namespace: "mynamespace",
     schedule: {
        checkIntervalMins: 5,
        initialDelayMs: 10000
     },
     options: {
  +     cache: {
  +        ttl: 3600000,              // Default: 1 hour (in milliseconds)
  +        dir: '.cache/figma',       // Optional: Custom cache directory
  +     }
        requestTimeout: 15000,
        proxyEndpoint: "<your proxy>",
        prefixDir: "/your/prefix/path",
        figmaToken: "<your token>",
        projects: {
           id: 1234567890,
           patternPrefix: "somePatternPrefix",
           meta: {
              tags: ["my-pattern"],
              data: {
                 source: "FIGMA",
                 owner: "fred",
              },
           },
        },
        endpoints: {
          getFile:
              "https://api.figma.com/v1/files/:file_id?plugin_data=shared&depth=1",
          getProject: "https://api.figma.com/v1/projects/:project_id/files",
          generateThumbnail:
              "https://api.figma.com/v1/images/:project_id?ids=:node_id"
        }
     }
  }
  ```

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.95
- @jpmorganchase/mosaic-source-http@0.1.0-beta.95
- @jpmorganchase/mosaic-types@0.1.0-beta.95

## 0.1.0-beta.94

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.94
- @jpmorganchase/mosaic-source-http@0.1.0-beta.94
- @jpmorganchase/mosaic-types@0.1.0-beta.94

## 0.1.0-beta.93

### Patch Changes

- Updated dependencies [699e570b]
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.93
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.93
  - @jpmorganchase/mosaic-types@0.1.0-beta.93

## 0.1.0-beta.92

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.92
- @jpmorganchase/mosaic-source-http@0.1.0-beta.92
- @jpmorganchase/mosaic-types@0.1.0-beta.92

## 0.1.0-beta.91

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.91
- @jpmorganchase/mosaic-source-http@0.1.0-beta.91
- @jpmorganchase/mosaic-types@0.1.0-beta.91

## 0.1.0-beta.90

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.90
- @jpmorganchase/mosaic-source-http@0.1.0-beta.90
- @jpmorganchase/mosaic-types@0.1.0-beta.90

## 0.1.0-beta.89

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.89
- @jpmorganchase/mosaic-source-http@0.1.0-beta.89
- @jpmorganchase/mosaic-types@0.1.0-beta.89

## 0.1.0-beta.88

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.88
- @jpmorganchase/mosaic-source-http@0.1.0-beta.88
- @jpmorganchase/mosaic-types@0.1.0-beta.88

## 0.1.0-beta.87

### Patch Changes

- Updated dependencies [14942195]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.87
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.87
  - @jpmorganchase/mosaic-types@0.1.0-beta.87

## 0.1.0-beta.86

### Patch Changes

- 749b3268: fix Figma source JSON issue

  If a Figma page did not defined `sharedPluginData` then the Figma source would break

- Updated dependencies [b8361977]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.86
  - @jpmorganchase/mosaic-types@0.1.0-beta.86
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.86

## 0.1.0-beta.85

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.85
- @jpmorganchase/mosaic-source-http@0.1.0-beta.85
- @jpmorganchase/mosaic-types@0.1.0-beta.85

## 0.1.0-beta.84

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.84
- @jpmorganchase/mosaic-source-http@0.1.0-beta.84
- @jpmorganchase/mosaic-types@0.1.0-beta.84

## 0.1.0-beta.83

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.83
- @jpmorganchase/mosaic-source-http@0.1.0-beta.83
- @jpmorganchase/mosaic-types@0.1.0-beta.83

## 0.1.0-beta.82

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.82
- @jpmorganchase/mosaic-source-http@0.1.0-beta.82
- @jpmorganchase/mosaic-types@0.1.0-beta.82

## 0.1.0-beta.81

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.81
- @jpmorganchase/mosaic-source-http@0.1.0-beta.81
- @jpmorganchase/mosaic-types@0.1.0-beta.81

## 0.1.0-beta.80

### Patch Changes

- 1c5a9674: Fixed projects with multiple files not working.
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.80
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.80
  - @jpmorganchase/mosaic-types@0.1.0-beta.80

## 0.1.0-beta.79

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.79
- @jpmorganchase/mosaic-source-http@0.1.0-beta.79
- @jpmorganchase/mosaic-types@0.1.0-beta.79

## 0.1.0-beta.78

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.78
- @jpmorganchase/mosaic-source-http@0.1.0-beta.78
- @jpmorganchase/mosaic-types@0.1.0-beta.78

## 0.1.0-beta.77

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.77
- @jpmorganchase/mosaic-source-http@0.1.0-beta.77
- @jpmorganchase/mosaic-types@0.1.0-beta.77

## 0.1.0-beta.76

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.76
- @jpmorganchase/mosaic-source-http@0.1.0-beta.76
- @jpmorganchase/mosaic-types@0.1.0-beta.76

## 0.1.0-beta.75

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.75
- @jpmorganchase/mosaic-source-http@0.1.0-beta.75
- @jpmorganchase/mosaic-types@0.1.0-beta.75

## 0.1.0-beta.74

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.74
- @jpmorganchase/mosaic-source-http@0.1.0-beta.74
- @jpmorganchase/mosaic-types@0.1.0-beta.74

## 0.1.0-beta.73

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.73
- @jpmorganchase/mosaic-source-http@0.1.0-beta.73
- @jpmorganchase/mosaic-types@0.1.0-beta.73

## 0.1.0-beta.72

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.72
- @jpmorganchase/mosaic-source-http@0.1.0-beta.72
- @jpmorganchase/mosaic-types@0.1.0-beta.72

## 0.1.0-beta.71

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.71
- @jpmorganchase/mosaic-source-http@0.1.0-beta.71
- @jpmorganchase/mosaic-types@0.1.0-beta.71

## 0.1.0-beta.70

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.70
- @jpmorganchase/mosaic-source-http@0.1.0-beta.70
- @jpmorganchase/mosaic-types@0.1.0-beta.70

## 0.1.0-beta.69

### Patch Changes

- f528d96b: Split Storybook endpoint into seperate paths

  Previously we used a single url to access `stories.json` and the
  linked story. Split this into

  - `storiesUrl`: the full url to `stories.json`
  - `storyUrlPrefix`: the url to prefix each story reference with

  Refactored the `meta` of sources so we refer to the content preview as
  'contentUrl`and the link we open in a seperate tab as`link`

  - @jpmorganchase/mosaic-schemas@0.1.0-beta.69
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.69
  - @jpmorganchase/mosaic-types@0.1.0-beta.69

## 0.1.0-beta.68

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.68
- @jpmorganchase/mosaic-source-http@0.1.0-beta.68
- @jpmorganchase/mosaic-types@0.1.0-beta.68

## 0.1.0-beta.67

### Patch Changes

- 30e2f038: Align source APIs for Figma, Storybook and Readme

  Updates to related sources so that have consistent APIs.

  - `tags` is now visible in the `meta`, previously deleted
  - use `meta.tags` rather than rely on a CSV copy in `meta.data.tags`
  - move un-neccessary `meta.data` to config (e.g `source`)
  - removed `additionalTags` and `additionalData` from Storybook source and use `meta` instead
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.67
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.67
  - @jpmorganchase/mosaic-types@0.1.0-beta.67

## 0.1.0-beta.66

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.66
- @jpmorganchase/mosaic-source-http@0.1.0-beta.66
- @jpmorganchase/mosaic-types@0.1.0-beta.66

## 0.1.0-beta.65

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.65
- @jpmorganchase/mosaic-source-http@0.1.0-beta.65
- @jpmorganchase/mosaic-types@0.1.0-beta.65

## 0.1.0-beta.64

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.64
- @jpmorganchase/mosaic-source-http@0.1.0-beta.64
- @jpmorganchase/mosaic-types@0.1.0-beta.64

## 0.1.0-beta.63

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.63
- @jpmorganchase/mosaic-source-http@0.1.0-beta.63
- @jpmorganchase/mosaic-types@0.1.0-beta.63

## 0.1.0-beta.62

### Minor Changes

- 9a0fd668: use image previews generated by Figma's REST API to avoid auth issues with Figma embeds

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.62
- @jpmorganchase/mosaic-source-http@0.1.0-beta.62
- @jpmorganchase/mosaic-types@0.1.0-beta.62

## 0.1.0-beta.61

### Patch Changes

- cec89401: add `pluginTimeout` (20 secs) to fastify to prevent loading timeout
- Updated dependencies [cec89401]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.61
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.61
  - @jpmorganchase/mosaic-types@0.1.0-beta.61

## 0.1.0-beta.60

### Patch Changes

- Updated dependencies [a3da0830]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.60
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.60
  - @jpmorganchase/mosaic-types@0.1.0-beta.60

## 0.1.0-beta.59

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.59
- @jpmorganchase/mosaic-source-http@0.1.0-beta.59
- @jpmorganchase/mosaic-types@0.1.0-beta.59
