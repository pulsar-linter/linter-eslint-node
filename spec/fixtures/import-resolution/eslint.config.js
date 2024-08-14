const importPlugin = require('eslint-plugin-import-x');

module.exports = [
  {
    plugins: {
     'import-x': importPlugin,
    },
    rules: {
      'import-x/no-unresolved': 'error',
    }
  }
];
