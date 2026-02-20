module.exports = {
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
  rewrites() {
    return {
      // These rewrites are checked after headers/redirects
      // and before all files including _next/public files which
      // allows overriding page files
      beforeFiles: [{ source: '/favicon.ico', destination: '/img/favicon.png' }],
      // These rewrites are checked after pages/public files
      // are checked but before dynamic routes
      afterFiles: []
    };
  },
  images: {
    domains: [
      /** Insert the domains where you will load images from */
      /* https://nextjs.org/docs/messages/next-image-unconfigured-host */
    ]
  },
  env: {},
  async redirects() {
    return [
      {
        source: '/',
        destination: '/mosaic/index',
        permanent: true
      },
      {
        source: '/mosaic',
        destination: '/mosaic/index',
        permanent: true
      },
      {
        source: '/local',
        destination: '/local/index',
        permanent: true
      }
    ];
  }
};
