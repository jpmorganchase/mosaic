/**
 * Mosaic site Next config.
 *
 * Two build targets are supported:
 *
 *  1. Default — full Next.js App Router build. Supports active mode (SSR
 *     per request) and snapshot modes (pre-rendered at build time via
 *     `generateStaticParams` in `src/app/[...route]/page.tsx`).
 *
 *  2. `MOSAIC_OUTPUT=export` — fully static export. Only valid when
 *     MOSAIC_MODE is `snapshot-file` or `snapshot-s3`. In this mode we:
 *       - set `output: 'export'`
 *       - drop `redirects()` (unsupported in export builds; express them
 *         via the hosting layer, e.g. S3 / CloudFront rules, when
 *         deploying a static export).
 *       - API routes (`/api/auth/*`, `/api/content/preview`) are not
 *         emitted; consumers needing them must use the default build
 *         target.
 */
const isExport = process.env.MOSAIC_OUTPUT === 'export';
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
  outputFileTracingExcludes: {
    '*': ['**/.next/cache/webpack']
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
  images: {
    domains: [
      /** Insert the domains where you will load images from */
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

module.exports = isExport
  ? { ...baseConfig, ...exportConfig }
  : { ...baseConfig, ...dynamicOnlyConfig };
