module.exports = {
  overrides: [
    {
      files: ['./**/*'],
      extends: ['next'],
      rules: {
        'react/react-in-jsx-scope': 'off',
        '@next/next/no-html-link-for-pages': 'off',
        'import/no-extraneous-dependencies': ['off']
      }
    }
  ]
};
