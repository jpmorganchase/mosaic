const sharedConfig = require('./scripts/jest/jest.config.base.js');

const moduleNameMapper = {
  '\\.(css)$': 'identity-obj-proxy',
  '.+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
    '<rootDir>/__mocks__/file-stub.js',
  '@jpmorganchase/mosaic-components': '<rootDir>/packages/components/dist/index.js',
  '@jpmorganchase/mosaic-icons': '<rootDir>/packages/icons/dist/index.js',
  '@jpmorganchase/mosaic-store': '<rootDir>/packages/store/dist/index.js',
  '@jpmorganchase/mosaic-theme': '<rootDir>/packages/theme/dist/index.js'
};

module.exports = {
  displayName: 'Client Tests',
  ...sharedConfig,
  testEnvironment: 'jsdom',
  moduleNameMapper,
  setupFiles: ['./scripts/jest/client/jest.setup.js'],
  setupFilesAfterEnv: ['./scripts/jest/client/jest.environment.js'],
  // Add tests paths to roots
  roots: [
    '<rootDir>/__mocks__',
    '<rootDir>/packages/components',
    '<rootDir>/packages/content-editor-plugin',
    '<rootDir>/packages/site-components',
    '<rootDir>/packages/store'
  ]
};
