module.exports = {
  extends: ['airbnb', 'airbnb-typescript', 'plugin:eslint-comments/recommended', 'prettier'],
  parserOptions: {
    project: ['./tsconfig.json']
  },
  plugins: ['import', 'prettier', 'promise'],
  rules: {
    'no-console': 'off',
    'no-restricted-syntax': ['error', 'LabeledStatement', 'WithStatement'],
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
    'no-underscore-dangle': 'off'
  },
  overrides: [
    {
      files: ['**/*.ts', 'packages/*/src/**/*.tsx', 'packages/site/newsletters/**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended', 'plugin:import/typescript'],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-var-requires': 0,
        '@typescript-eslint/ban-ts-comment': 1,
        '@typescript-eslint/no-empty-interface': 0,
        '@typescript-eslint/lines-between-class-members': 0
      }
    }
  ]
};
