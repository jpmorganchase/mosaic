'use strict';

module.exports = {
  presets: ['@babel/preset-typescript', '@babel/preset-env'],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-private-methods',
    '@babel/transform-runtime'
  ]
};
