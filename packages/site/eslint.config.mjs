import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

// This configuration also ships in the standalone site archive.
const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript.map(entry => (entry.ignores ? entry : { ...entry, files: ['**/*.{ts,tsx}'] })),
  {
    ignores: [
      '**/dist/**',
      '**/.tmp/**',
      '**/coverage/**',
      '**/__tests__/**',
      'snapshots/**',
      'public/**',
      'playwright-report/**',
      'test-results/**'
    ]
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      'react/jsx-filename-extension': ['warn', { extensions: ['.tsx'] }]
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-control-regex': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ]
    }
  }
];

export default config;
