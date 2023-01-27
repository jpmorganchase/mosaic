const sharedConfig = require('./scripts/jest/jest.config.base.js');

const moduleNameMapper = {
  '^(\\.{1,2}/.*)\\.js$': '$1',
  '^lodash-es$': 'lodash'
};

module.exports = {
  displayName: 'Server Tests',
  ...sharedConfig,
  testEnvironment: 'node',
  moduleNameMapper,
  setupFiles: ['./scripts/jest/server/jest.setup.js'],
  setupFilesAfterEnv: ['./scripts/jest/server/jest.environment.js'],
  // Add tests paths to roots
  roots: [
    '<rootDir>/packages/core',
    '<rootDir>/packages/fromHttpRequest',
    '<rootDir>/packages/plugins',
    '<rootDir>/packages/site-middleware',
    '<rootDir>/packages/source-http'
  ]
};
