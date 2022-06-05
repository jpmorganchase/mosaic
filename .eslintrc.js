module.exports = {
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:eslint-comments/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:promise/recommended',
    'plugin:react/recommended',
    'plugin:prettier/recommended',
    './node_modules/@cib-digital-pfm/lint/rules/digital-platform-base.js',
    './node_modules/@cib-digital-pfm/lint/rules/digital-platform-prettier.js',
    './node_modules/@cib-digital-pfm/lint-react/rules/digital-platform-react.js'
  ],
  plugins: ['import', 'prettier', 'promise', 'react', 'react-hooks'],
  globals: {
    after: true,
    before: true,
    cy: true,
    Cypress: true
  },
  rules: {
    'react/jsx-sort-props': 'off',
    'no-restricted-syntax': ['error', 'LabeledStatement', 'WithStatement'],
    // Ignore certain webpack alias because it can't be resolved
    'import/no-unresolved': [
      'error',
      { ignore: ['^@theme', '^@docusaurus', '^@generated', '^@site'] }
    ],
    'no-restricted-imports': [
      'error',
      {
        patterns: ['!styles.module.css']
      }
    ]
  },
  overrides: [
    {
      extends: ['plugin:mdx/recommended'],
      files: ['packages/site/samples/**/*.md[x]', 'packages/docs/**/*.md[x]'],
      rules: {
        'import/no-unresolved': [
          'error',
          { ignore: ['^@theme', '^@docusaurus', '^@generated', '^@site'] }
        ],
        'mdx/no-unescaped-entities': 0,
        'no-useless-escape': 0,
        'react-hooks/rules-of-hooks': 0,
        'react/jsx-no-target-blank': 0,
        'react/no-unescaped-entities': 0,
        'react/display-name': 0,
        'react/prop-types': 0
      }
    },
    {
      // Allow complexity on swizzled Docusaurus components
      files: [
        'packages/site/src/theme/DocItem/index.js',
        'packages/site/src/theme/Layout/index.tsx'
      ],
      rules: {
        complexity: 'off'
      }
    },
    {
      files: ['**/*.ts', 'packages/*/src/**/*.tsx', 'packages/site/newsletters/**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:import/typescript',
        'prettier/@typescript-eslint',
        './node_modules/@cib-digital-pfm/lint-typescript/rules/digital-platform-typescript.js'
      ],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-var-requires': 0,
        '@typescript-eslint/ban-ts-comment': 1,
        '@typescript-eslint/no-empty-interface': 0
      }
    },
    {
      // Allow camel case for `unstable_toolkit`
      files: ['src/**/*.js'],
      rules: {
        camelcase: [
          'error',
          {
            allow: ['unstable_toolkit']
          }
        ]
      }
    },
    {
      // Allow empty functions in the Jest configuration
      files: ['scripts/jest/*.js'],
      rules: {
        'no-empty-function': 'off'
      }
    }
  ]
};
