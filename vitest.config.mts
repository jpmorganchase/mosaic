import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    maxConcurrency: 10,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      include: ['**/packages/**'],
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
    exclude: ['**/node_modules/**', '**/dist/.*\\.(ts|js)$']
  }
});
