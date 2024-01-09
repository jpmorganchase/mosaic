const withMDX = require('@next/mdx')();

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});

const nextConfig = {
  experimental: {
    mdxRs: true
  },
  reactStrictMode: true,
  output: process.env.GENERATE_STATIC_PARAMS_URL ? 'export' : 'standalone',
  swcMinify: true,
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

module.exports = withBundleAnalyzer(withMDX(nextConfig));
