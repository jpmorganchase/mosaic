'use strict';
const util = require('util');

class MockEncoder {
  encode(value) {
    return value;
  }
}
class MockDecoder {
  decode(value) {
    return value;
  }
}

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
  globals: {
    TextEncoder: MockEncoder,
    TextDecoder: MockDecoder
  },
  testRegex: '(/__tests__/.+\\.test)\\.(js|ts)x?$',
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest']
  },
  transformIgnorePatterns: ['/node_modules/'],
  setupFiles: ['./testSetup.js']
};
