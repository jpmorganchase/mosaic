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
        branches: 25,
        functions: 30,
        lines: 30,
        statements: 30
      }
    },
    exclude: ['**/node_modules/**', '**/dist/.*\\.(ts|js)$']
  }
});
