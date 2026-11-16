/** A genuine external host: no workspace aliases or access to checkout sources. */
export default {
  reactStrictMode: true,
  transpilePackages: [
    '@jpmorganchase/mosaic-components',
    '@jpmorganchase/mosaic-content-editor-plugin',
    '@jpmorganchase/mosaic-icons',
    '@jpmorganchase/mosaic-layouts',
    '@jpmorganchase/mosaic-site-components',
    '@jpmorganchase/mosaic-site-middleware',
    '@jpmorganchase/mosaic-store',
    '@jpmorganchase/mosaic-theme'
  ],
  experimental: { optimizePackageImports: ['@salt-ds/core', '@salt-ds/icons'], cpus: 2 }
};
