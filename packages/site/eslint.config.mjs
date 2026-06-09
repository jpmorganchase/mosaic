import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  ...nextCoreWebVitals.map(cfg => ({
    ...cfg,
    files: ['src/**/*.{js,jsx,ts,tsx}']
  })),
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'import/no-extraneous-dependencies': 'off',
      'import/no-duplicates': 'off',
      'react/react-in-jsx-scope': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      'react/function-component-definition': 'off',
      'react/jsx-filename-extension': ['warn', { extensions: ['.tsx'] }],
      'react/jsx-props-no-spreading': 'off'
    }
  }
];
