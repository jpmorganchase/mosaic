/**
 * Mosaic site Next config.
 *
 * `MOSAIC_OUTPUT` picks the build target:
 *
 *  1. Unset — full Next.js App Router build for `next start`. Supports
 *     active mode (SSR per request) and snapshot modes (pre-rendered at
 *     build time via `generateStaticParams` in
 *     `src/app/[namespace]/[...route]/page.tsx`).
 *
 *  2. `standalone` — the same build plus `output: 'standalone'`, which
 *     the Dockerfiles copy from `.next/standalone` and run with
 *     `node server.js`. (`next start` doesn't support standalone output,
 *     which is why it isn't the default.) Docker builds start from a
 *     clean layer, so Turbopack's build cache is not written.
 *
 *  3. `export` — fully static export. Only valid when MOSAIC_MODE is
 *     `snapshot-file` or `snapshot-s3`. In this mode we:
 *       - set `output: 'export'`
 *       - drop `redirects()` (unsupported in export builds; express them
 *         via the hosting layer, e.g. S3 / CloudFront rules, when
 *         deploying a static export).
 *       - run against stubs of the API route handlers (501) and Server
 *         Actions (see `scripts/static-export-route-stubs.mjs`), so
 *         sign-in, the content editor and cache revalidation need one of
 *         the server targets above.
 */
const isExport = process.env.MOSAIC_OUTPUT === 'export';
const isStandalone = process.env.MOSAIC_OUTPUT === 'standalone';
const mosaicMode = process.env.MOSAIC_MODE || 'active';

if (isExport && !mosaicMode.startsWith('snapshot')) {
  // Fail loudly rather than producing a broken export.
  throw new Error(
    `[mosaic-site] MOSAIC_OUTPUT=export requires a snapshot MOSAIC_MODE (got "${mosaicMode}"). ` +
      'Set MOSAIC_MODE to "snapshot-file" or "snapshot-s3" before building.'
  );
}

/** @type {import('next').NextConfig} */
const baseConfig = {
  // Build caches (webpack's or Turbopack's) are never needed at runtime;
  // keep them out of traced server bundles and standalone output.
  outputFileTracingExcludes: {
    '*': ['**/.next/cache/**']
  },
  outputFileTracingIncludes: {
    '/*': ['snapshots/**/*']
  },
  transpilePackages: [
    '@jpmorganchase/mosaic-components',
    '@jpmorganchase/mosaic-content-editor-plugin',
    '@jpmorganchase/mosaic-layouts',
    '@jpmorganchase/mosaic-open-api-component',
    '@jpmorganchase/mosaic-site-components',
    '@jpmorganchase/mosaic-site-middleware',
    '@jpmorganchase/mosaic-theme',
    '@jpmorganchase/mosaic-store'
  ],
  // Transform named barrel imports (e.g.
  // `import { Card, GridLayout } from '@salt-ds/core'`) into direct
  // submodule imports at build time so the client bundle only pulls
  // the components actually used. Salt-DS re-exports its full
  // surface from its package root, so without this each barrel
  // import drags the entire library into the chunk that touches it.
  // `lodash-es` is already on Next's default-optimized list (Next 14+)
  // so it doesn't need to be repeated here.
  experimental: {
    optimizePackageImports: ['@salt-ds/core', '@salt-ds/icons']
  },
  images: {
    remotePatterns: [
      /** Insert the remote hosts you will load images from, e.g. { protocol: 'https', hostname: 'images.example.com' } */
      /* https://nextjs.org/docs/messages/next-image-unconfigured-host */
    ]
  },
  env: {}
};

/** @type {import('next').NextConfig} */
const dynamicOnlyConfig = {
  rewrites() {
    return {
      beforeFiles: [{ source: '/favicon.ico', destination: '/img/favicon.png' }],
      afterFiles: []
    };
  },
  async redirects() {
    return [
      { source: '/', destination: '/mosaic/index', permanent: true },
      { source: '/mosaic', destination: '/mosaic/index', permanent: true },
      { source: '/local', destination: '/local/index', permanent: true }
    ];
  }
};

/** @type {import('next').NextConfig} */
const exportConfig = {
  output: 'export',
  // `next build` with `output: 'export'` requires `images.unoptimized: true`
  // because the default image optimizer needs a Node runtime.
  images: {
    ...baseConfig.images,
    unoptimized: true
  },
  trailingSlash: false
};

/** @type {import('next').NextConfig} */
const standaloneConfig = {
  output: 'standalone',
  experimental: {
    ...baseConfig.experimental,
    turbopackFileSystemCacheForBuild: false
  }
};

module.exports = isExport
  ? { ...baseConfig, ...exportConfig }
  : { ...baseConfig, ...dynamicOnlyConfig, ...(isStandalone ? standaloneConfig : {}) };
