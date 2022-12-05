module.exports = {
  overrides: [
    {
      files: ['./src/**/*'],
      extends: ['next'],
      rules: {
        'import/no-extraneous-dependencies': ['off'],
        'import/no-duplicates': ['off'],
        'react/react-in-jsx-scope': 'off',
        '@next/next/no-html-link-for-pages': 'off'
      }
    }
  ]
};
