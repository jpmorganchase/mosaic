import { defineConfig } from 'vitest/config';

/**
 * Root vitest config. Vitest 4 removed `defineWorkspace` /
 * `vitest.workspace.mts`; project definitions now live inside the root
 * config under `test.projects`.
 *
 * The two projects mirror what `yarn test:server` / `yarn test:client`
 * were running before the upgrade:
 *
 *  - `server` — Node environment, runs server-side suites in
 *    `cli`, `core`, `fromHttpRequest`, `plugins`, `site-middleware`,
 *    and the `source-*` packages. Polyfills `globalThis.Request` so
 *    libs like msw work.
 *
 *  - `client` — jsdom environment, runs the React-component
 *    `ReactLive.test.tsx` suites only (other component tests aren't yet
 *    vitest-ready and live behind `WorkerSubscription.test.ts` /
 *    other excludes). CSS imports are stubbed to `identity-obj-proxy`.
 *
 * Common excludes (`e2e/`, `node_modules/`, `dist/`, `.next/`) prevent
 * Vitest 4's broader default discovery from picking up Playwright e2e
 * files and built artefacts.
 */

const COMMON_EXCLUDES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/packages/site/e2e/**'
];

export default defineConfig({
  test: {
    maxConcurrency: 10,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      include: ['**/packages/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/__tests__/**',
        '**/packages/{site,theme}/**',
        '**/*.css.ts',
        '**/scripts/**'
      ],
      thresholds: {
        branches: 10,
        functions: 10,
        lines: 10,
        statements: 10
      }
    },
    projects: [
      {
        test: {
          name: 'server',
          include: [
            '**/{cli,core,fromHttpRequest,plugins,site-middleware,source-figma,source-http,source-readme,source-storybook}/**/__tests__/*.test.[jt]s?(x)'
          ],
          setupFiles: ['./scripts/vitest/vitest.server.setup.mts'],
          exclude: [
            ...COMMON_EXCLUDES,
            // Has complex mocking so is hard to migrate to vitest, needs to be revisited.
            '**/WorkerSubscription.test.ts'
          ]
        }
      },
      {
        test: {
          name: 'client',
          environment: 'jsdom',
          include: [
            '**/{components,content-editor-plugin,site-components,sitemap-component,store}/**/__tests__/ReactLive.test.[jt]s?(x)'
          ],
          setupFiles: ['./scripts/vitest/vitest.client.setup.mts'],
          exclude: COMMON_EXCLUDES,
          alias: [
            {
              find: /.*\.css$/,
              replacement: 'identity-obj-proxy'
            }
          ]
        }
      }
    ]
  }
});
