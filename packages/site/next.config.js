const withMDX = require('@next/mdx')();

const nextConfig = {
  experimental: {
    appDir: true,
    mdxRs: true
  },
  reactStrictMode: true,
  output: process.env.GENERATE_STATIC_PARAMS_URL ? 'export' : 'standalone',
  swcMinify: true,
  transpilePackages: [
    '@jpmorganchase/mosaic-components',
    '@jpmorganchase/mosaic-content-editor-plugin',
    '@jpmorganchase/mosaic-layouts',
    '@jpmorganchase/mosaic-site-components',
    '@jpmorganchase/mosaic-theme',
    '@jpmorganchase/mosaic-store'
  ],
  images: {
    domains: [
      /** Insert the domains where you will load images from */
      /* https://nextjs.org/docs/messages/next-image-unconfigured-host */
    ]
  },
  webpack(config) {
    // Required by MDX-JS
    if (config.resolve.fallback) {
      config.resolve.fallback.fs = false;
    } else {
      config.resolve.fallback = { fs: false };
    }
    config.experiments.topLevelAwait = true;
    return config;
  },
  env: {}
};

module.exports = withMDX(nextConfig);
