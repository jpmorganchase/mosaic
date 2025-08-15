import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'server',
      include: [
        '**/{cli,core,fromHttpRequest,plugins,site-middleware,source-figma,source-http,source-readme,source-storybook}/**/__tests__/*.test.[j|t]s?(x)'
      ],
      setupFiles: ['./scripts/vitest/vitest.server.setup.mts'],
      // Has complex mocking so is hard to migrate to vitest, needs to be revisited.
      exclude: ['**/WorkerSubscription.test.ts']
    }
  },
  {
    test: {
      name: 'client',
      environment: 'jsdom',
      include: [
        '**/{components,content-editor-plugin,site-components,sitemap-component,store}/**/__tests__/ReactLive.test.[j|t]s?(x)'
      ],
      setupFiles: ['./scripts/vitest/vitest.client.setup.mts'],
      alias: [
        {
          find: /.*\.css$/,
          replacement: 'identity-obj-proxy'
        }
      ]
    }
  }
]);
