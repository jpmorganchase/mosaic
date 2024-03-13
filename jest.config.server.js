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
    '<rootDir>/packages/cli',
    '<rootDir>/packages/core',
    '<rootDir>/packages/fromHttpRequest',
    '<rootDir>/packages/plugins',
    '<rootDir>/packages/site-middleware',
    '<rootDir>/packages/source-figma',
    '<rootDir>/packages/source-http',
    '<rootDir>/packages/source-readme',
    '<rootDir>/packages/source-storybook'
  ],
  transformIgnorePatterns: [
    // Ignore node_modules except for the following packages (required to run Plugin tests)
    '/node_modules/(?!(unified|bail|trough|vfile.*|unist.*|remark.*|micromark.*|.*character-reference.*|estree-util.*|ccount|.*mdast.*|is-.*|.*entities.*|zwitch|longest-streak)/)'
  ]
};
