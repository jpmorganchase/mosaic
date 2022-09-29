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
  testRegex: '(/__tests__/.+\\.test)\\.(js|ts)x?$',
  transform: {
    '\\.[jt]sx?$': require.resolve('babel-jest'),
  },
  transformIgnorePatterns: ['/node_modules/']
};
