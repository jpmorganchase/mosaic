module.exports = {
  extends: [
    'airbnb',
    'airbnb-typescript',
    'plugin:eslint-comments/recommended',
    'prettier',
    'plugin:react-hooks/recommended'
  ],
  parserOptions: {
    project: ['./tsconfig.json']
  },
  plugins: ['import', 'prettier', 'promise'],
  rules: {
    'no-console': 'off',
    'no-restricted-syntax': ['error', 'LabeledStatement', 'WithStatement'],
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx', '.tsx'] }],
    'no-underscore-dangle': 'off',
    'no-await-in-loop': 'off',
    'no-continue': 'off',
    'no-plusplus': 'off',
    'guard-for-in': 'off',
    'max-classes-per-file': 'off',
    'import/prefer-default-export': 'off',
    'react/function-component-definition': 'off',
    'react/require-default-props': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-props-no-spreading': 'off'
  },
  overrides: [
    {
      files: ['**/*.ts', 'packages/*/src/**/*.tsx'],
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
  ],
  settings: {
    react: {
      version: 'detect'
    }
  }
};
