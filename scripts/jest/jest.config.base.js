'use strict';

module.exports = {
  collectCoverage: true,
  // TODO increase coverage once we backfill with e2e testing
  coverageThreshold: {
    global: {
      branches: 0.63,
      functions: 1,
      lines: 1,
      statements: 1
    }
  },
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/.*\\.(ts|js)$', '/__tests__/test-utils/'],
  testRegex: '(/__tests__/.+\\.test)\\.(js|ts)x?$',
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest']
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/.*\\.(ts|js)$']
};
