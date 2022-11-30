const sharedConfig = require('./scripts/jest/jest.config.base.js');

module.exports = {
  displayName: 'Server Tests',
  ...sharedConfig,
  testEnvironment: 'node',
  setupFiles: ['./scripts/jest/server/jest.setup.js'],
  setupFilesAfterEnv: ['./scripts/jest/server/jest.environment.js'],
  // Add tests paths to roots
  roots: ['<rootDir>/packages/core', '<rootDir>/packages/plugins']
};
