---
'@jpmorganchase/mosaic-source-figma': minor
---

Add Thumbnail cache to reduce impact of Figma rate limits

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
